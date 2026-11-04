package com.familyos.core.data

import com.familyos.core.database.*
import com.familyos.core.domain.HouseholdRepository
import kotlinx.coroutines.flow.Flow

class HouseholdRepositoryImpl(
    private val pantryDao: PantryDao,
    private val wardrobeDao: WardrobeDao,
    private val outfitDao: OutfitDao
) : HouseholdRepository {

    override fun observePantryItems(familyId: String): Flow<List<PantryItemEntity>> {
        return pantryDao.observeAll(familyId)
    }

    override fun observeLowStockItems(familyId: String): Flow<List<PantryItemEntity>> {
        return pantryDao.observeLowStock(familyId)
    }

    override fun observeExpiringItems(familyId: String, cutoffTime: Long): Flow<List<PantryItemEntity>> {
        return pantryDao.observeExpiring(familyId, cutoffTime)
    }

    override suspend fun addPantryItem(item: PantryItemEntity) {
        pantryDao.upsert(item)
    }

    override suspend fun consumePantryItem(id: String, amount: Double) {
        val current = pantryDao.getById(id) ?: return
        val newQty = (current.quantity - amount).coerceAtLeast(0.0)
        val isLow = newQty <= current.minThreshold
        pantryDao.updateQuantity(id, newQty, isLow)
    }

    override suspend fun deletePantryItem(id: String) {
        pantryDao.softDelete(id)
    }

    override fun observeWardrobeItems(familyId: String, memberId: String?): Flow<List<WardrobeItemEntity>> {
        return if (memberId != null) {
            wardrobeDao.observeByMember(familyId, memberId)
        } else {
            wardrobeDao.observeAll(familyId)
        }
    }

    override suspend fun addWardrobeItem(item: WardrobeItemEntity) {
        wardrobeDao.upsert(item)
    }

    override suspend fun toggleWardrobeCleanStatus(id: String, isClean: Boolean) {
        wardrobeDao.setCleanStatus(id, isClean)
    }

    override fun observeOutfitPlans(familyId: String, memberId: String?): Flow<List<OutfitPlanEntity>> {
        return if (memberId != null) {
            outfitDao.observeByMember(familyId, memberId)
        } else {
            outfitDao.observeAll(familyId)
        }
    }

    override suspend fun saveOutfitPlan(plan: OutfitPlanEntity) {
        outfitDao.upsert(plan)
    }
}
