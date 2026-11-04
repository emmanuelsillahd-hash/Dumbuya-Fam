package com.familyos.core.data

import com.familyos.core.database.*
import com.familyos.core.domain.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

class FinanceRepositoryImpl(
    private val financeDao: FinanceDao
) : FinanceRepository {

    override fun observeAccounts(familyId: String): Flow<List<FinancialAccount>> {
        return financeDao.observeAccounts(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun createAccount(account: FinancialAccount) {
        financeDao.insertOrUpdateAccount(account.toEntity())
    }

    override fun observeTransactions(familyId: String): Flow<List<FinancialTransaction>> {
        return financeDao.observeTransactions(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun recordIncome(transaction: FinancialTransaction) {
        financeDao.recordIncome(transaction.toEntity())
    }

    override suspend fun recordExpense(transaction: FinancialTransaction) {
        financeDao.recordExpense(transaction.toEntity())
    }

    override suspend fun recordInternalTransfer(
        familyId: String,
        sourceAccountId: String,
        destinationAccountId: String,
        amountCents: Long,
        title: String,
        notes: String?
    ) {
        val transferTx = FinancialTransactionEntity(
            id = UUID.randomUUID().toString(),
            familyId = familyId,
            accountId = sourceAccountId,
            destinationAccountId = destinationAccountId,
            title = title,
            amountCents = amountCents,
            transactionType = "TRANSFER",
            category = "TRANSFER",
            transactionDate = System.currentTimeMillis(),
            isCleared = true,
            isReversal = false,
            reversalOfId = null,
            notes = notes,
            paidByMemberId = null,
            createdAt = System.currentTimeMillis()
        )
        financeDao.recordTransfer(sourceAccountId, destinationAccountId, transferTx)
    }

    override suspend fun reverseTransaction(transactionId: String, reason: String) {
        val original = financeDao.getTransactionById(transactionId) ?: return
        if (original.isReversal) return // Prevent reversing a reversal transaction
        val existingReversal = financeDao.getReversalForTransaction(original.id)
        if (existingReversal != null) return // Prevent duplicate reversals of the same original transaction

        val reversalTx = FinancialTransactionEntity(
            id = UUID.randomUUID().toString(),
            familyId = original.familyId,
            accountId = original.accountId,
            destinationAccountId = original.destinationAccountId,
            title = "Reversal: ${original.title}",
            amountCents = original.amountCents,
            transactionType = original.transactionType,
            category = original.category,
            transactionDate = System.currentTimeMillis(),
            isCleared = true,
            isReversal = true,
            reversalOfId = original.id,
            notes = "Reversal reason: $reason",
            paidByMemberId = null,
            createdAt = System.currentTimeMillis()
        )
        financeDao.reverseTransaction(original, reversalTx)
    }

    override fun observeBudgets(familyId: String): Flow<List<EnvelopeBudget>> {
        return combine(
            financeDao.observeBudgets(familyId),
            financeDao.observeTransactions(familyId)
        ) { budgetEntities, transactionEntities ->
            val spentByCategory = mutableMapOf<String, Long>()
            for (tx in transactionEntities) {
                if (tx.transactionType == "EXPENSE") {
                    val key = tx.category.uppercase()
                    val current = spentByCategory[key] ?: 0L
                    val delta = if (tx.isReversal) -tx.amountCents else tx.amountCents
                    spentByCategory[key] = (current + delta).coerceAtLeast(0L)
                }
            }
            budgetEntities.map { entity ->
                val spent = spentByCategory[entity.category.uppercase()] ?: 0L
                entity.toDomain(spentCents = spent)
            }
        }
    }

    override suspend fun setBudget(budget: EnvelopeBudget) {
        financeDao.insertOrUpdateBudget(budget.toEntity())
    }

    override fun observeSavingsGoals(familyId: String): Flow<List<SavingsGoal>> {
        return financeDao.observeSavingsGoals(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun saveSavingsGoal(goal: SavingsGoal) {
        financeDao.insertOrUpdateSavingsGoal(goal.toEntity())
    }

    override suspend fun contributeToSavingsGoal(goalId: String, amountCents: Long) {
        financeDao.contributeToSavingsGoal(goalId, amountCents)
    }

    override fun observeBills(familyId: String): Flow<List<BillSubscription>> {
        return financeDao.observeBills(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun saveBill(bill: BillSubscription) {
        financeDao.insertOrUpdateBill(bill.toEntity())
    }

    override fun observeInvestmentHoldings(familyId: String): Flow<List<InvestmentHolding>> {
        return financeDao.observeInvestmentHoldings(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun saveInvestmentHolding(holding: InvestmentHolding) {
        financeDao.insertOrUpdateInvestmentHolding(holding.toEntity())
    }

    override suspend fun updateHoldingMarketPrice(holdingId: String, newPriceCents: Long) {
        financeDao.updateHoldingMarketPrice(holdingId, newPriceCents)
    }

    override suspend fun deleteInvestmentHolding(holdingId: String) {
        financeDao.softDeleteInvestmentHolding(holdingId)
    }

    override suspend fun recordInvestmentPurchase(
        holding: InvestmentHolding,
        purchaseTransaction: FinancialTransaction
    ) {
        financeDao.recordInvestmentPurchase(holding.toEntity(), purchaseTransaction.toEntity())
    }

    override suspend fun calculateCashFlow(familyId: String): CashFlowPlan {
        val accounts = financeDao.getAccountsSync(familyId)
        // Approximate expected monthly recurring income vs expenses
        return CashFlowPlan(
            expectedIncomeCents = 850000L, // Baseline planned monthly household income ($8,500.00)
            recurringExpensesCents = 320000L, // Mortgage, utilities, car ($3,200.00)
            otherPlannedExpensesCents = 150000L, // Groceries & variable ($1,500.00)
            plannedSavingsCents = 150000L,
            plannedEmergencyReserveCents = 100000L,
            plannedPriorityObjectivesCents = 80000L
        )
    }

    override suspend fun calculateNetWorth(familyId: String): NetWorthSummary {
        val accounts = financeDao.getAccountsSync(familyId)
        var totalAssets = 0L
        var totalLiabilities = 0L

        for (acc in accounts) {
            if (acc.isLiability) {
                totalLiabilities += kotlin.math.abs(acc.currentBalanceCents)
            } else {
                totalAssets += acc.currentBalanceCents
            }
        }
        return NetWorthSummary(totalAssetsCents = totalAssets, totalLiabilitiesCents = totalLiabilities)
    }

    private fun FinancialAccountEntity.toDomain() = FinancialAccount(
        id = id,
        familyId = familyId,
        name = name,
        accountType = AccountType.valueOf(accountType),
        currentBalanceCents = currentBalanceCents,
        isLiability = isLiability,
        currency = currency,
        institution = institution,
        isArchived = isArchived,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun FinancialAccount.toEntity() = FinancialAccountEntity(
        id = id,
        familyId = familyId,
        name = name,
        accountType = accountType.name,
        currentBalanceCents = currentBalanceCents,
        isLiability = isLiability,
        currency = currency,
        institution = institution,
        isArchived = isArchived,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun FinancialTransactionEntity.toDomain() = FinancialTransaction(
        id = id,
        familyId = familyId,
        accountId = accountId,
        destinationAccountId = destinationAccountId,
        title = title,
        amountCents = amountCents,
        transactionType = TransactionType.valueOf(transactionType),
        category = category,
        transactionDate = transactionDate,
        isCleared = isCleared,
        isReversal = isReversal,
        reversalOfId = reversalOfId,
        notes = notes,
        paidByMemberId = paidByMemberId,
        createdAt = createdAt
    )

    private fun FinancialTransaction.toEntity() = FinancialTransactionEntity(
        id = id,
        familyId = familyId,
        accountId = accountId,
        destinationAccountId = destinationAccountId,
        title = title,
        amountCents = amountCents,
        transactionType = transactionType.name,
        category = category,
        transactionDate = transactionDate,
        isCleared = isCleared,
        isReversal = isReversal,
        reversalOfId = reversalOfId,
        notes = notes,
        paidByMemberId = paidByMemberId,
        createdAt = createdAt
    )

    private fun EnvelopeBudgetEntity.toDomain(spentCents: Long = 0L) = EnvelopeBudget(
        id = id,
        familyId = familyId,
        category = category,
        allocatedCents = allocatedCents,
        spentCents = spentCents,
        monthEpoch = monthEpoch,
        alertThresholdPercentage = alertThresholdPercentage
    )

    private fun EnvelopeBudget.toEntity() = EnvelopeBudgetEntity(
        id = id,
        familyId = familyId,
        category = category,
        allocatedCents = allocatedCents,
        monthEpoch = monthEpoch,
        alertThresholdPercentage = alertThresholdPercentage
    )

    private fun SavingsGoalEntity.toDomain() = SavingsGoal(
        id = id,
        familyId = familyId,
        linkedAccountId = linkedAccountId,
        title = title,
        targetCents = targetCents,
        currentCents = currentCents,
        plannedMonthlyContributionCents = plannedMonthlyContributionCents,
        targetDate = targetDate,
        isCompleted = isCompleted
    )

    private fun SavingsGoal.toEntity() = SavingsGoalEntity(
        id = id,
        familyId = familyId,
        linkedAccountId = linkedAccountId,
        title = title,
        targetCents = targetCents,
        currentCents = currentCents,
        plannedMonthlyContributionCents = plannedMonthlyContributionCents,
        targetDate = targetDate,
        isCompleted = isCompleted
    )

    private fun BillSubscriptionEntity.toDomain() = BillSubscription(
        id = id,
        familyId = familyId,
        preferredAccountId = preferredAccountId,
        payee = payee,
        amountCents = amountCents,
        billingCycle = billingCycle,
        dueDate = dueDate,
        isSubscription = isSubscription,
        isAutoPay = isAutoPay,
        reminderDaysBefore = reminderDaysBefore
    )

    private fun BillSubscription.toEntity() = BillSubscriptionEntity(
        id = id,
        familyId = familyId,
        preferredAccountId = preferredAccountId,
        payee = payee,
        amountCents = amountCents,
        billingCycle = billingCycle,
        dueDate = dueDate,
        isSubscription = isSubscription,
        isAutoPay = isAutoPay,
        reminderDaysBefore = reminderDaysBefore
    )

    private fun InvestmentHoldingEntity.toDomain() = InvestmentHolding(
        id = id,
        familyId = familyId,
        accountId = accountId,
        symbol = symbol,
        assetName = assetName,
        assetType = assetType,
        quantityMicroshares = quantityMicroshares,
        costBasisCents = costBasisCents,
        currentPriceCents = currentPriceCents,
        currency = currency,
        notes = notes,
        lastPriceUpdatedAt = lastPriceUpdatedAt,
        syncStatus = syncStatus,
        isDeleted = isDeleted,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun InvestmentHolding.toEntity() = InvestmentHoldingEntity(
        id = id,
        familyId = familyId,
        accountId = accountId,
        symbol = symbol,
        assetName = assetName,
        assetType = assetType,
        quantityMicroshares = quantityMicroshares,
        costBasisCents = costBasisCents,
        currentPriceCents = currentPriceCents,
        currency = currency,
        notes = notes,
        lastPriceUpdatedAt = lastPriceUpdatedAt,
        syncStatus = syncStatus,
        isDeleted = isDeleted,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

class WellbeingRepositoryImpl(
    private val wellbeingDao: WellbeingDao
) : WellbeingRepository {

    override fun observeProfiles(familyId: String): Flow<List<MemberWellbeingProfile>> {
        return wellbeingDao.observeAllProfiles(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override fun observeProfileForMember(memberId: String): Flow<MemberWellbeingProfile?> {
        return wellbeingDao.observeProfileForMember(memberId).map { it?.toDomain() }
    }

    override suspend fun saveProfile(profile: MemberWellbeingProfile) {
        wellbeingDao.insertOrUpdateProfile(profile.toEntity())
    }

    override fun observeAllergiesForMember(memberId: String): Flow<List<HealthAllergy>> {
        return wellbeingDao.observeAllergiesForMember(memberId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun addAllergy(allergy: HealthAllergy) {
        wellbeingDao.insertAllergy(allergy.toEntity())
    }

    override fun observeMedicationsForMember(memberId: String): Flow<List<HealthMedication>> {
        return wellbeingDao.observeMedicationsForMember(memberId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun saveMedication(medication: HealthMedication) {
        wellbeingDao.insertOrUpdateMedication(medication.toEntity())
    }

    override fun observeVaccinationsForMember(memberId: String): Flow<List<HealthVaccination>> {
        return wellbeingDao.observeVaccinationsForMember(memberId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun recordVaccination(vaccination: HealthVaccination) {
        wellbeingDao.insertVaccination(vaccination.toEntity())
    }

    override fun observeAppointments(familyId: String): Flow<List<HealthcareAppointment>> {
        return wellbeingDao.observeAppointments(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun scheduleAppointment(appointment: HealthcareAppointment) {
        wellbeingDao.insertOrUpdateAppointment(appointment.toEntity())
    }

    private fun WellbeingProfileEntity.toDomain() = MemberWellbeingProfile(
        id = id,
        familyId = familyId,
        memberId = memberId,
        bloodType = bloodType,
        medicalConditions = parseJsonList(medicalConditionsJson),
        insuranceProvider = insuranceProvider,
        insurancePolicyNumber = insurancePolicyNumber,
        primaryPhysicianName = primaryPhysicianName,
        primaryPhysicianPhone = primaryPhysicianPhone,
        notes = notes,
        updatedAt = updatedAt
    )

    private fun MemberWellbeingProfile.toEntity() = WellbeingProfileEntity(
        id = id,
        familyId = familyId,
        memberId = memberId,
        bloodType = bloodType,
        medicalConditionsJson = Json.encodeToString(medicalConditions),
        insuranceProvider = insuranceProvider,
        insurancePolicyNumber = insurancePolicyNumber,
        primaryPhysicianName = primaryPhysicianName,
        primaryPhysicianPhone = primaryPhysicianPhone,
        notes = notes,
        updatedAt = updatedAt
    )

    private fun HealthAllergyEntity.toDomain() = HealthAllergy(
        id = id,
        familyId = familyId,
        memberId = memberId,
        allergen = allergen,
        severity = severity,
        reaction = reaction,
        emergencyTreatment = emergencyTreatment
    )

    private fun HealthAllergy.toEntity() = HealthAllergyEntity(
        id = id,
        familyId = familyId,
        memberId = memberId,
        allergen = allergen,
        severity = severity,
        reaction = reaction,
        emergencyTreatment = emergencyTreatment
    )

    private fun HealthMedicationEntity.toDomain() = HealthMedication(
        id = id,
        familyId = familyId,
        memberId = memberId,
        medicationName = medicationName,
        dosage = dosage,
        scheduleFrequency = scheduleFrequency,
        scheduleTimes = parseJsonList(scheduleTimesJson),
        instructions = instructions,
        isActive = isActive
    )

    private fun HealthMedication.toEntity() = HealthMedicationEntity(
        id = id,
        familyId = familyId,
        memberId = memberId,
        medicationName = medicationName,
        dosage = dosage,
        scheduleFrequency = scheduleFrequency,
        scheduleTimesJson = Json.encodeToString(scheduleTimes),
        instructions = instructions,
        isActive = isActive
    )

    private fun HealthVaccinationEntity.toDomain() = HealthVaccination(
        id = id,
        familyId = familyId,
        memberId = memberId,
        vaccineName = vaccineName,
        dateAdministered = dateAdministered,
        nextBoosterDate = nextBoosterDate,
        provider = provider,
        lotNumber = lotNumber
    )

    private fun HealthVaccination.toEntity() = HealthVaccinationEntity(
        id = id,
        familyId = familyId,
        memberId = memberId,
        vaccineName = vaccineName,
        dateAdministered = dateAdministered,
        nextBoosterDate = nextBoosterDate,
        provider = provider,
        lotNumber = lotNumber
    )

    private fun HealthcareAppointmentEntity.toDomain() = HealthcareAppointment(
        id = id,
        familyId = familyId,
        memberId = memberId,
        providerName = providerName,
        specialty = specialty,
        appointmentTime = appointmentTime,
        location = location,
        notes = notes
    )

    private fun HealthcareAppointment.toEntity() = HealthcareAppointmentEntity(
        id = id,
        familyId = familyId,
        memberId = memberId,
        providerName = providerName,
        specialty = specialty,
        appointmentTime = appointmentTime,
        location = location,
        notes = notes
    )

    private fun parseJsonList(raw: String): List<String> {
        return try {
            Json.decodeFromString(raw)
        } catch (_: Exception) {
            emptyList()
        }
    }
}

class EmergencyRepositoryImpl(
    private val emergencyDao: EmergencyDao
) : EmergencyRepository {

    override fun observeContacts(familyId: String): Flow<List<EmergencyContact>> {
        return emergencyDao.observeContacts(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun saveContact(contact: EmergencyContact) {
        emergencyDao.insertOrUpdateContact(contact.toEntity())
    }

    override suspend fun deleteContact(id: String) {
        emergencyDao.deleteContact(id)
    }

    override fun observePlan(familyId: String): Flow<EmergencyPlan?> {
        return emergencyDao.observeEmergencyPlan(familyId).map { it?.toDomain() }
    }

    override suspend fun savePlan(plan: EmergencyPlan) {
        emergencyDao.insertOrUpdateEmergencyPlan(plan.toEntity())
    }

    override fun observeSupplies(familyId: String): Flow<List<EmergencySupply>> {
        return emergencyDao.observeSupplies(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun saveSupply(supply: EmergencySupply) {
        emergencyDao.insertSupply(supply.toEntity())
    }

    override suspend fun toggleSupplyChecked(id: String, isChecked: Boolean) {
        emergencyDao.setSupplyChecked(id, isChecked)
    }

    override fun observeChecklist(familyId: String): Flow<List<EmergencyChecklistItem>> {
        return emergencyDao.observeChecklistItems(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun saveChecklistItem(item: EmergencyChecklistItem) {
        emergencyDao.insertChecklistItem(item.toEntity())
    }

    override suspend fun toggleChecklistItem(id: String, isCompleted: Boolean) {
        emergencyDao.setChecklistItemCompleted(
            id = id,
            isCompleted = isCompleted,
            completedAt = if (isCompleted) System.currentTimeMillis() else null
        )
    }

    private fun EmergencyContactEntity.toDomain() = EmergencyContact(
        id = id,
        familyId = familyId,
        name = name,
        relationship = relationship,
        phonePrimary = phonePrimary,
        phoneSecondary = phoneSecondary,
        isPrimary = isPrimary,
        notes = notes
    )

    private fun EmergencyContact.toEntity() = EmergencyContactEntity(
        id = id,
        familyId = familyId,
        name = name,
        relationship = relationship,
        phonePrimary = phonePrimary,
        phoneSecondary = phoneSecondary,
        isPrimary = isPrimary,
        notes = notes
    )

    private fun EmergencyPlanEntity.toDomain() = EmergencyPlan(
        id = id,
        familyId = familyId,
        primaryMeetingPoint = primaryMeetingPoint,
        secondaryMeetingPoint = secondaryMeetingPoint,
        evacuationRoute = evacuationRoute,
        gasShutoffLocation = gasShutoffLocation,
        waterShutoffLocation = waterShutoffLocation,
        electricalPanelLocation = electricalPanelLocation,
        notes = notes
    )

    private fun EmergencyPlan.toEntity() = EmergencyPlanEntity(
        id = id,
        familyId = familyId,
        primaryMeetingPoint = primaryMeetingPoint,
        secondaryMeetingPoint = secondaryMeetingPoint,
        evacuationRoute = evacuationRoute,
        gasShutoffLocation = gasShutoffLocation,
        waterShutoffLocation = waterShutoffLocation,
        electricalPanelLocation = electricalPanelLocation,
        notes = notes
    )

    private fun EmergencySupplyEntity.toDomain() = EmergencySupply(
        id = id,
        familyId = familyId,
        itemName = itemName,
        category = category,
        quantity = quantity,
        storageLocation = storageLocation,
        expiryDate = expiryDate,
        isChecked = isChecked
    )

    private fun EmergencySupply.toEntity() = EmergencySupplyEntity(
        id = id,
        familyId = familyId,
        itemName = itemName,
        category = category,
        quantity = quantity,
        storageLocation = storageLocation,
        expiryDate = expiryDate,
        isChecked = isChecked
    )

    private fun EmergencyChecklistItemEntity.toDomain() = EmergencyChecklistItem(
        id = id,
        familyId = familyId,
        title = title,
        category = category,
        isCompleted = isCompleted,
        assignedMemberId = assignedMemberId,
        completedAt = completedAt
    )

    private fun EmergencyChecklistItem.toEntity() = EmergencyChecklistItemEntity(
        id = id,
        familyId = familyId,
        title = title,
        category = category,
        isCompleted = isCompleted,
        assignedMemberId = assignedMemberId,
        completedAt = completedAt
    )
}
