
package com.finpocket.controller;

import com.finpocket.entity.Transaction;
import com.finpocket.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Transaction>> getTransactions(
            Authentication authentication) {

        return ResponseEntity.ok(
                service.getAll(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<Transaction> createTransaction(
            Authentication authentication,
            @Valid @RequestBody Transaction transaction) {

        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.create(authentication.getName(), transaction));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody Transaction transaction) {

        return ResponseEntity.ok(
                service.update(authentication.getName(), id, transaction));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            Authentication authentication,
            @PathVariable String id) {

        service.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
