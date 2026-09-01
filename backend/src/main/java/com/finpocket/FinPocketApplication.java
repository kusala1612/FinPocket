package com.finpocket;

import com.finpocket.entity.Role;
import com.finpocket.entity.User;
import com.finpocket.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class FinPocketApplication {

    private static final Logger logger = LoggerFactory.getLogger(FinPocketApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(FinPocketApplication.class, args);
    }

    @Bean
    CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Seed default admin account if none exists
            if (userRepository.countByRole(Role.ADMIN) == 0) {
                User admin = User.builder()
                        .fullName("System Administrator")
                        .email("admin@finpocket.com")
                        .password(passwordEncoder.encode("Admin@123"))
                        .role(Role.ADMIN)
                        .build();

                userRepository.save(admin);
                logger.info("===========================================");
                logger.info("Default admin account created:");
                logger.info("Email: admin@finpocket.com");
                logger.info("Password: Admin@123");
                logger.info("IMPORTANT: Change this password immediately!");
                logger.info("===========================================");
            } else {
                logger.info("Admin account already exists. Skipping seed.");
            }
        };
    }
}
