package com.familyos.core.data

import com.familyos.core.database.RoutineDao
import com.familyos.core.database.RoutineEntity
import com.familyos.core.database.RoutineOccurrenceEntity
import com.familyos.core.domain.*
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Production-ready implementation of RoutineRepository.
 * Backed by SQLCipher-encrypted Room database for durable offline storage.
 * Ensures that occurrence completions persist immediately to SQLite and never mutate the parent routine definition into a completed/archived state.
 */
class RoutineRepositoryImpl(
    private val routineDao: RoutineDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : RoutineRepository {

    override fun observeRoutines(familyId: String): Flow<List<Routine>> {
        return routineDao.observeRoutines(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun observeOccurrencesForDate(familyId: String, targetDate: String): Flow<List<RoutineOccurrence>> {
        return routineDao.observeOccurrencesForDate(familyId, targetDate).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun observeAllOccurrences(familyId: String): Flow<List<RoutineOccurrence>> {
        return routineDao.observeAllOccurrences(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun getRoutineById(id: String): Result<Routine?> = withContext(ioDispatcher) {
        val entity = routineDao.getRoutineById(id)
        Result.success(entity?.toDomain())
    }

    override suspend fun saveRoutine(routine: Routine): Result<Routine> = withContext(ioDispatcher) {
        val entity = routine.toEntity()
        routineDao.insertRoutine(entity)
        Result.success(routine)
    }

    override suspend fun setRoutinePaused(routineId: String, isPaused: Boolean): Result<Unit> = withContext(ioDispatcher) {
        routineDao.setRoutinePaused(routineId, isPaused)
        Result.success(Unit)
    }

    override suspend fun deleteRoutine(id: String): Result<Unit> = withContext(ioDispatcher) {
        routineDao.deleteRoutine(id)
        Result.success(Unit)
    }

    override suspend fun getOrCreateOccurrence(
        routineId: String,
        targetDate: String,
        familyId: String
    ): Result<RoutineOccurrence> = withContext(ioDispatcher) {
        val existing = routineDao.getOccurrenceForRoutineDate(routineId, targetDate)
        if (existing != null) {
            return@withContext Result.success(existing.toDomain())
        }

        val parentRoutine = routineDao.getRoutineById(routineId)
        val initialStepsMap = mutableMapOf<String, Boolean>()
        if (parentRoutine != null) {
            val domain = parentRoutine.toDomain()
            domain.steps.forEach { step ->
                initialStepsMap[step.id] = false
            }
        }

        val occurrenceId = "occ-${routineId}-${targetDate}"
        val newEntity = RoutineOccurrenceEntity(
            id = occurrenceId,
            familyId = familyId,
            routineId = routineId,
            targetDate = targetDate,
            status = "PENDING",
            stepCompletionsJson = mapToJson(initialStepsMap),
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        routineDao.insertOccurrence(newEntity)
        Result.success(newEntity.toDomain())
    }

    override suspend fun toggleStep(
        routineId: String,
        occurrenceId: String,
        stepId: String,
        isDone: Boolean
    ): Result<RoutineOccurrence> = withContext(ioDispatcher) {
        val existing = routineDao.getOccurrenceById(occurrenceId)
            ?: return@withContext Result.failure(IllegalArgumentException("Occurrence $occurrenceId not found"))

        val currentMap = jsonToMap(existing.stepCompletionsJson).toMutableMap()
        currentMap[stepId] = isDone
        val allDone = currentMap.isNotEmpty() && currentMap.values.all { it }
        val newStatus = if (allDone) "COMPLETED" else "IN_PROGRESS"

        val updatedEntity = existing.copy(
            status = newStatus,
            stepCompletionsJson = mapToJson(currentMap),
            completedAt = if (allDone) (existing.completedAt ?: System.currentTimeMillis()) else null,
            updatedAt = System.currentTimeMillis()
        )
        routineDao.updateOccurrence(updatedEntity)
        Result.success(updatedEntity.toDomain())
    }

    override suspend fun completeOccurrence(
        routineId: String,
        occurrenceId: String,
        memberId: String
    ): Result<RoutineOccurrence> = withContext(ioDispatcher) {
        val occurrence = routineDao.getOccurrenceById(occurrenceId)
            ?: return@withContext Result.failure(IllegalArgumentException("Occurrence $occurrenceId not found"))

        val parentRoutine = routineDao.getRoutineById(routineId)
        val points = parentRoutine?.pointsReward ?: 15

        // Complete all steps in occurrence
        val currentMap = jsonToMap(occurrence.stepCompletionsJson)
        val allCompletedMap = currentMap.keys.associateWith { true }
        val now = System.currentTimeMillis()

        routineDao.markOccurrenceCompleted(
            occurrenceId = occurrenceId,
            status = "COMPLETED",
            stepsJson = mapToJson(allCompletedMap),
            completedAt = now,
            memberId = memberId,
            points = points
        )

        // Increment routine streak count in Room WITHOUT completing or disabling parent routine
        if (parentRoutine != null) {
            val newStreak = parentRoutine.streakCount + 1
            val bestStreak = maxOf(parentRoutine.bestStreakCount, newStreak)
            routineDao.updateRoutineStreak(
                routineId = routineId,
                streak = newStreak,
                bestStreak = bestStreak,
                lastDate = occurrence.targetDate
            )
        }

        val reloaded = routineDao.getOccurrenceById(occurrenceId)!!
        Result.success(reloaded.toDomain())
    }

    override suspend fun skipOccurrence(
        routineId: String,
        occurrenceId: String,
        reason: String
    ): Result<RoutineOccurrence> = withContext(ioDispatcher) {
        routineDao.markOccurrenceSkipped(occurrenceId, reason)
        val reloaded = routineDao.getOccurrenceById(occurrenceId)
            ?: return@withContext Result.failure(IllegalArgumentException("Occurrence $occurrenceId not found"))
        Result.success(reloaded.toDomain())
    }

    override suspend fun convertOccurrenceToTask(
        routineId: String,
        occurrenceId: String,
        taskId: String
    ): Result<Unit> = withContext(ioDispatcher) {
        routineDao.setOccurrenceLinkedTaskId(occurrenceId, taskId)
        Result.success(Unit)
    }

    override suspend fun seedDefaultRoutinesIfEmpty(familyId: String): Result<Unit> = withContext(ioDispatcher) {
        val defaultRoutines = listOf(
            Routine(
                id = "rtn-morning",
                familyId = familyId,
                title = "Morning Household Rhythm",
                description = "Mindful wake-up, bedroom tidy, dog walk, and breakfast.",
                category = RoutineCategory.MORNING,
                frequency = RoutineFrequency.WEEKDAYS,
                targetTimeOfDay = "07:00",
                scope = "FAMILY",
                ownerMemberId = "mem-sarah",
                assignedMemberIds = listOf("mem-sarah", "mem-david", "mem-lucas", "mem-charlotte"),
                steps = listOf(
                    RoutineStep("s1", "Make bed and open blinds", 0, 5),
                    RoutineStep("s2", "Feed & walk Buster", 1, 20),
                    RoutineStep("s3", "Prepare breakfast & water bottles", 2, 15),
                    RoutineStep("s4", "5-min family daily intention", 3, 5)
                ),
                pointsReward = 15,
                streakCount = 6,
                bestStreakCount = 14
            ),
            Routine(
                id = "rtn-evening",
                familyId = familyId,
                title = "Evening Kitchen Close & Wind-Down",
                description = "Reset counters, dishwasher, backpack check, quiet reading.",
                category = RoutineCategory.EVENING,
                frequency = RoutineFrequency.DAILY,
                targetTimeOfDay = "20:30",
                scope = "FAMILY",
                ownerMemberId = "mem-david",
                assignedMemberIds = listOf("mem-david", "mem-lucas", "mem-charlotte"),
                steps = listOf(
                    RoutineStep("s5", "Wipe counters & run dishwasher", 0, 10),
                    RoutineStep("s6", "Pack school backpacks", 1, 10),
                    RoutineStep("s7", "Lock doors & arm perimeter", 2, 5),
                    RoutineStep("s8", "20-minute quiet reading", 3, 20)
                ),
                pointsReward = 20,
                streakCount = 9,
                bestStreakCount = 21
            )
        )

        for (rtn in defaultRoutines) {
            val existing = routineDao.getRoutineById(rtn.id)
            if (existing == null) {
                routineDao.insertRoutine(rtn.toEntity())
            }
        }

        Result.success(Unit)
    }

    // --- Entity <-> Domain Mappings ---

    private fun RoutineEntity.toDomain(): Routine {
        val steps = parseStepsJson(stepsJson)
        val assignedIds = parseStringArrayJson(assignedMemberIdsJson)
        return Routine(
            id = id,
            familyId = familyId,
            title = title,
            description = description,
            category = try { RoutineCategory.valueOf(category) } catch (_: Exception) { RoutineCategory.HOUSEHOLD },
            frequency = try { RoutineFrequency.valueOf(frequency) } catch (_: Exception) { RoutineFrequency.DAILY },
            targetTimeOfDay = targetTimeOfDay,
            scope = scope,
            ownerMemberId = ownerMemberId,
            assignedMemberIds = assignedIds,
            steps = steps,
            pointsReward = pointsReward,
            isPaused = isPaused,
            streakCount = streakCount,
            bestStreakCount = bestStreakCount,
            lastCompletedDate = lastCompletedDate
        )
    }

    private fun Routine.toEntity(): RoutineEntity {
        return RoutineEntity(
            id = id,
            familyId = familyId,
            title = title,
            description = description,
            category = category.name,
            frequency = frequency.name,
            targetTimeOfDay = targetTimeOfDay,
            scope = scope,
            ownerMemberId = ownerMemberId,
            assignedMemberIdsJson = stringListToJson(assignedMemberIds),
            stepsJson = stepsListToJson(steps),
            pointsReward = pointsReward,
            isPaused = isPaused,
            streakCount = streakCount,
            bestStreakCount = bestStreakCount,
            lastCompletedDate = lastCompletedDate,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }

    private fun RoutineOccurrenceEntity.toDomain(): RoutineOccurrence {
        return RoutineOccurrence(
            id = id,
            familyId = familyId,
            routineId = routineId,
            targetDate = targetDate,
            status = status,
            stepCompletions = jsonToMap(stepCompletionsJson),
            completedAt = completedAt,
            completedByMemberId = completedByMemberId,
            skippedReason = skippedReason,
            linkedTaskId = linkedTaskId
        )
    }

    // --- JSON Serialization Helpers ---

    private fun parseStepsJson(json: String): List<RoutineStep> {
        val list = mutableListOf<RoutineStep>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    RoutineStep(
                        id = obj.optString("id", UUID.randomUUID().toString()),
                        title = obj.optString("title", ""),
                        orderIndex = obj.optInt("orderIndex", i),
                        estimatedMinutes = if (obj.has("estimatedMinutes")) obj.optInt("estimatedMinutes") else null
                    )
                )
            }
        } catch (_: Exception) {}
        return list
    }

    private fun stepsListToJson(steps: List<RoutineStep>): String {
        val arr = JSONArray()
        steps.forEach { step ->
            val obj = JSONObject()
            obj.put("id", step.id)
            obj.put("title", step.title)
            obj.put("orderIndex", step.orderIndex)
            step.estimatedMinutes?.let { obj.put("estimatedMinutes", it) }
            arr.put(obj)
        }
        return arr.toString()
    }

    private fun parseStringArrayJson(json: String): List<String> {
        val list = mutableListOf<String>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                list.add(arr.getString(i))
            }
        } catch (_: Exception) {}
        return list
    }

    private fun stringListToJson(list: List<String>): String {
        val arr = JSONArray()
        list.forEach { arr.put(it) }
        return arr.toString()
    }

    private fun mapToJson(map: Map<String, Boolean>): String {
        val obj = JSONObject()
        map.forEach { (k, v) -> obj.put(k, v) }
        return obj.toString()
    }

    private fun jsonToMap(json: String): Map<String, Boolean> {
        val map = mutableMapOf<String, Boolean>()
        try {
            val obj = JSONObject(json)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                map[key] = obj.optBoolean(key, false)
            }
        } catch (_: Exception) {}
        return map
    }
}
