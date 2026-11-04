package com.familyos.core.data

import com.familyos.core.database.*
import com.familyos.core.domain.*
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

class FamilyWorkspaceRepositoryImpl(
    private val workspaceDao: FamilyWorkspaceDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : FamilyWorkspaceRepository {

    override fun observeWorkspaces(): Flow<List<FamilyWorkspace>> {
        return workspaceDao.observeAllWorkspaces().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun observeActiveWorkspace(workspaceId: String): Flow<FamilyWorkspace?> {
        return workspaceDao.observeWorkspaceById(workspaceId).map { it?.toDomain() }
    }

    override suspend fun getWorkspace(workspaceId: String): FamilyWorkspace? = withContext(ioDispatcher) {
        workspaceDao.getWorkspaceById(workspaceId)?.toDomain()
    }

    override suspend fun createWorkspace(
        name: String,
        currencyCode: String,
        ownerUserId: String,
        ownerDisplayName: String?,
        motto: String?
    ): Result<FamilyWorkspace> = withContext(ioDispatcher) {
        try {
            val now = System.currentTimeMillis()
            val workspaceId = "fam-$now-${UUID.randomUUID().toString().replace("-", "").take(12)}"
            val memberId = "mem-owner-$now-${UUID.randomUUID().toString().replace("-", "").take(8)}"
            val membershipId = "memship-owner-$now-${UUID.randomUUID().toString().replace("-", "").take(8)}"

            val workspaceEntity = FamilyWorkspaceEntity(
                id = workspaceId,
                name = name.trim(),
                description = motto?.trim(),
                currencyCode = currencyCode,
                ownerUserId = ownerUserId
            )
            val resolvedOwnerName = ownerDisplayName?.trim()?.ifBlank { null } ?: "Family Founder"
            val ownerProfileEntity = FamilyMemberEntity(
                id = memberId,
                familyId = workspaceId,
                displayName = resolvedOwnerName,
                relationshipToPrimary = "SELF",
                isRestrictedProfile = false
            )
            val membershipEntity = FamilyMembershipEntity(
                id = membershipId,
                familyId = workspaceId,
                userAccountId = ownerUserId,
                memberProfileId = memberId,
                role = "OWNER"
            )

            workspaceDao.createWorkspaceWithOwner(workspaceEntity, ownerProfileEntity, membershipEntity)
            Result.success(workspaceEntity.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateWorkspace(
        workspaceId: String,
        name: String,
        description: String?
    ): Result<Unit> = withContext(ioDispatcher) {
        try {
            val current = workspaceDao.getWorkspaceById(workspaceId)
                ?: return@withContext Result.failure(IllegalArgumentException("Workspace not found"))
            workspaceDao.insertOrUpdateWorkspace(
                current.copy(
                    name = name.trim(),
                    description = description?.trim(),
                    updatedAt = System.currentTimeMillis()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteWorkspace(workspaceId: String): Result<Unit> = withContext(ioDispatcher) {
        try {
            workspaceDao.softDeleteWorkspace(workspaceId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class FamilyMemberRepositoryImpl(
    private val memberDao: FamilyMemberDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : FamilyMemberRepository {

    override fun observeMembers(familyId: String): Flow<List<FamilyMember>> {
        return memberDao.observeMembersByFamily(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun getMember(memberId: String): FamilyMember? = withContext(ioDispatcher) {
        memberDao.getMemberById(memberId)?.toDomain()
    }

    override suspend fun addMember(
        familyId: String,
        displayName: String,
        relationship: String,
        isRestrictedProfile: Boolean
    ): Result<FamilyMember> = withContext(ioDispatcher) {
        try {
            val member = FamilyMemberEntity(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                displayName = displayName.trim(),
                relationshipToPrimary = relationship,
                isRestrictedProfile = isRestrictedProfile
            )
            memberDao.insertOrUpdateMember(member)
            Result.success(member.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateMember(member: FamilyMember): Result<Unit> = withContext(ioDispatcher) {
        try {
            val current = memberDao.getMemberById(member.id)
                ?: return@withContext Result.failure(IllegalArgumentException("Member not found"))
            memberDao.insertOrUpdateMember(
                current.copy(
                    displayName = member.displayName.trim(),
                    relationshipToPrimary = member.relationshipToPrimary,
                    dietaryPreferencesJson = Json.encodeToString(member.dietaryPreferences),
                    allergiesJson = Json.encodeToString(member.allergies),
                    isRestrictedProfile = member.isRestrictedProfile,
                    pointsBalance = member.pointsBalance,
                    updatedAt = System.currentTimeMillis()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeMember(memberId: String): Result<Unit> = withContext(ioDispatcher) {
        try {
            memberDao.softDeleteMember(memberId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private val memberJsonParser = Json { ignoreUnknownKeys = true }

private fun parseStringListJson(rawJson: String): List<String> {
    if (rawJson.isBlank()) return emptyList()
    return try {
        memberJsonParser.decodeFromString<List<String>>(rawJson)
    } catch (_: Exception) {
        emptyList()
    }
}

// Mappers
internal fun FamilyWorkspaceEntity.toDomain() = FamilyWorkspace(
    id = id,
    name = name,
    description = description,
    logoUrl = logoUrl,
    currencyCode = currencyCode,
    ownerUserId = ownerUserId,
    isDeleted = isDeleted
)

internal fun FamilyMemberEntity.toDomain() = FamilyMember(
    id = id,
    familyId = familyId,
    displayName = displayName,
    relationshipToPrimary = relationshipToPrimary,
    birthDate = birthDate,
    avatarUrl = avatarUrl,
    dietaryPreferences = parseStringListJson(dietaryPreferencesJson),
    allergies = parseStringListJson(allergiesJson),
    isRestrictedProfile = isRestrictedProfile,
    pointsBalance = pointsBalance
)
