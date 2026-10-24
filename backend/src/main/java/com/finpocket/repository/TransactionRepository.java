
package com.finpocket.repository;

import com.finpocket.entity.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository
        extends MongoRepository<Transaction, String> {

    List<Transaction> findByUserEmailOrderByDateDesc(String userEmail);

    Optional<Transaction> findByIdAndUserEmail(
            String id, String userEmail);

    long countByUserEmail(String userEmail);
}
