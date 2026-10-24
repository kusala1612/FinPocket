
package com.finpocket.service;

import com.finpocket.entity.Transaction;
import com.finpocket.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository repository;

    public TransactionService(TransactionRepository repository) {
        this.repository = repository;
    }

    public List<Transaction> getAll(String email) {
        return repository.findByUserEmailOrderByDateDesc(email);
    }

    public Transaction create(String email, Transaction transaction) {
        validate(transaction);

        transaction.setId(null);
        transaction.setUserEmail(email);
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        return repository.save(transaction);
    }

    public Transaction update(
            String email, String id, Transaction changes) {

        validate(changes);

        Transaction existing = repository.findByIdAndUserEmail(id, email)
                .orElseThrow(() ->
                        new IllegalArgumentException("Transaction not found"));

        existing.setType(changes.getType().toUpperCase());
        existing.setAmount(changes.getAmount());
        existing.setDate(changes.getDate());
        existing.setCategory(changes.getCategory());
        existing.setDescription(changes.getDescription());
        existing.setReminderEnabled(changes.getReminderEnabled());
        existing.setReminderAt(changes.getReminderAt());
        existing.setRecurringActive(changes.getRecurringActive());
        existing.setRecurrenceFrequency(
                changes.getRecurrenceFrequency());
        existing.setRecurrenceEndDate(changes.getRecurrenceEndDate());
        existing.setUpdatedAt(LocalDateTime.now());

        return repository.save(existing);
    }

    public void delete(String email, String id) {
        Transaction existing = repository.findByIdAndUserEmail(id, email)
                .orElseThrow(() ->
                        new IllegalArgumentException("Transaction not found"));

        repository.delete(existing);
    }

    private void validate(Transaction transaction) {
        if (transaction.getType() == null ||
                !List.of("INCOME", "EXPENSE")
                        .contains(transaction.getType().toUpperCase())) {
            throw new IllegalArgumentException(
                    "Type must be INCOME or EXPENSE");
        }

        if (transaction.getAmount() == null ||
                transaction.getAmount() <= 0) {
            throw new IllegalArgumentException(
                    "Amount must be greater than zero");
        }

        if (transaction.getDate() == null ||
                transaction.getDate().isBlank()) {
            throw new IllegalArgumentException("Date is required");
        }

        try {
            LocalDate.parse(transaction.getDate());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(
                    "Date must use YYYY-MM-DD format");
        }

        if (transaction.getCategory() == null ||
                transaction.getCategory().isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }

        if (Boolean.TRUE.equals(transaction.getReminderEnabled())) {
            if (transaction.getReminderAt() == null ||
                    transaction.getReminderAt().isBlank()) {
                throw new IllegalArgumentException(
                        "Reminder date and time are required");
            }
        }

        if (Boolean.TRUE.equals(transaction.getRecurringActive())) {
            if (transaction.getRecurrenceFrequency() == null ||
                    !List.of("DAILY", "WEEKLY", "MONTHLY", "YEARLY")
                            .contains(transaction.getRecurrenceFrequency()
                                    .toUpperCase())) {
                throw new IllegalArgumentException(
                        "Select a valid recurrence frequency");
            }

            if (transaction.getRecurrenceEndDate() == null ||
                    transaction.getRecurrenceEndDate().isBlank()) {
                throw new IllegalArgumentException(
                        "Recurrence end date is required");
            }

            try {
                LocalDate endDate =
                        LocalDate.parse(transaction.getRecurrenceEndDate());

                if (endDate.isBefore(LocalDate.parse(transaction.getDate()))) {
                    throw new IllegalArgumentException(
                            "Recurrence end date cannot be before transaction date");
                }
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(
                        "Recurrence end date must use YYYY-MM-DD format");
            }
        }

        transaction.setType(transaction.getType().toUpperCase());
    }
}
