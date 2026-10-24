
package com.finpocket.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transactions")
public class Transaction {

    @Id
    private String id;

    private String userEmail;

    @NotBlank(message = "Transaction type is required")
    private String type;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private Double amount;

    @NotBlank(message = "Date is required")
    private String date;

    @NotBlank(message = "Category is required")
    private String category;

    private String description;

    @Builder.Default
    private Boolean reminderEnabled = false;

    private String reminderAt;

    @Builder.Default
    private Boolean recurringActive = false;

    @Builder.Default
    private String recurrenceFrequency = "NONE";

    private String recurrenceEndDate;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
