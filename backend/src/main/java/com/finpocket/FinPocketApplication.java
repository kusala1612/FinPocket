package com.finpocket;
import java.util.Optional;
// ============================================================
// IMPORTS
// ============================================================
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.data.mongodb.repository.Query;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.repository.MongoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import de.bwaldvogel.mongo.MongoServer;
import de.bwaldvogel.mongo.backend.memory.MemoryBackend;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.InetSocketAddress;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;


// ============================================================
// 1. APPLICATION
// ============================================================

@SpringBootApplication
@EnableScheduling
public class FinPocketApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinPocketApplication.class, args);
    }
}
    


@Configuration
@EnableMongoAuditing
class MongoConfig {
}


// ============================================================
// 3. ENUMS
// ============================================================

enum Role {
    USER,
    ADMIN
}

enum TransactionType {
    INCOME,
    EXPENSE
}

enum RecurrenceFrequency {
    NONE,
    DAILY,
    WEEKLY,
    MONTHLY,
    YEARLY
}

// ============================================================
// 4. USER MODULE
// ============================================================

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class User {

    @org.springframework.data.annotation.Id
    private String id;

    private String fullName;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String phone;

    @Builder.Default
    private Role role = Role.USER;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class UserDto {

    private String id;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private LocalDateTime createdAt;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class ProfileUpdateRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String phone;
}


// ============================================================
// 5. AUTHENTICATION / LOGIN / REGISTER MODULE
// ============================================================

@Data
@NoArgsConstructor
@AllArgsConstructor
class RegisterRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    private String phone;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
class AuthResponse {

    private boolean success;
    private String message;
    private String token;
    private String id;
    private String fullName;
    private String email;
    private Role role;
}


@Service
class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone() == null ? "" : request.getPhone().trim())
                .role(Role.USER)
                .build();

        userRepository.save(user);

        return AuthResponse.builder()
                .success(true)
                .message("Registration successful. Please login.")
                .build();
    }

    public AuthResponse login(LoginRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        String token = jwtService.generateToken(
                email,
                Map.of(
                        "role", user.getRole().name(),
                        "fullName", user.getFullName()
                )
        );

        return AuthResponse.builder()
                .success(true)
                .message("Login successful")
                .token(token)
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}


@RestController
@RequestMapping("/api/auth")
class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @PostMapping("/login")
    ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }
}


// ============================================================
// 6. JWT SECURITY MODULE
// ============================================================

@Service
class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration:86400000}")
    private long expiration;

    private javax.crypto.SecretKey signingKey;

    @PostConstruct
    void init() {
        byte[] keyBytes =
                Base64.getDecoder().decode(secret);

        signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(
            String username,
            Map<String, Object> extraClaims) {

        Date now = new Date();

        return Jwts.builder()
                .claims(extraClaims)
                .subject(username)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiration))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    public String extractUsername(String token) {

        return parseClaims(token)
                .getSubject();
    }

    public boolean isTokenValid(
            String token,
            UserDetails userDetails) {

        try {

            Claims claims = parseClaims(token);

            return claims.getSubject()
                    .equals(userDetails.getUsername())
                    && claims.getExpiration().after(new Date());

        } catch (Exception e) {
            return false;
        }
    }

    public boolean validateToken(String token) {

        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {

        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}


@Service
class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();
    }
}


@Component
class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {

            String token = header.substring(7);

            if (!jwtService.validateToken(token)) {
                sendUnauthorized(response, "Invalid or expired token");
                return;
            }

            String username =
                    jwtService.extractUsername(token);

            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(username);

            if (!jwtService.isTokenValid(token, userDetails)) {
                sendUnauthorized(response, "Invalid or expired token");
                return;
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);

        } catch (Exception e) {

            sendUnauthorized(response, "Authentication failed");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(
            HttpServletResponse response,
            String message)
            throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");

        response.getWriter().write(
                "{\"success\":false,\"message\":\""
                        + message
                        + "\"}"
        );
    }
}


@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private UserDetailsService userDetailsService;

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http)
            throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(cors -> cors.configurationSource(
                        corsConfigurationSource()))

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers("/api/auth/**")
                        .permitAll()

                        .requestMatchers(
                                "/api/admin/**")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                "/api/user/**",
                                 "/api/transactions/**",
                                "/api/categories/**",
                                "/api/budgets/**",
                                "/api/goals/**",
                                "/api/notifications/**",
                                "/api/analytics/**",
                                "/api/reports/**",
                                "/api/recommendations/**")
                        .hasAnyRole("USER", "ADMIN")

                        .requestMatchers(
                                "/error",
                                "/",
                                "/index.html",
                                "/login.html",
                                "/register.html")
                        .permitAll()

                        .anyRequest()
                        .authenticated()
                )

                .authenticationProvider(authenticationProvider())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider();

        provider.setUserDetailsService(
                userDetailsService);

        provider.setPasswordEncoder(
                passwordEncoder());

        return provider;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(
            org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration config)
            throws Exception {

        return config.getAuthenticationManager();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://localhost:5501",
                "http://127.0.0.1:5501",
                "http://localhost:3000",
                "http://127.0.0.1:3000"
        ));

        configuration.setAllowedMethods(Arrays.asList(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept"
        ));

        configuration.setExposedHeaders(
                List.of("Authorization"));

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration);

        return source;
    }
}


// ============================================================
// 7. CATEGORY MODULE
// ============================================================

@Document(collection = "categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Category {

    @org.springframework.data.annotation.Id
    private String id;

    private String userEmail;
    private String category;
    private String name;

    @Builder.Default
    private boolean custom = false;

    @Builder.Default
    private boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class CategoryRequest {

    @NotBlank(message = "Category name is required")
    private String name;
}


@Repository
interface CategoryRepository
        extends MongoRepository<Category, String> {

    List<Category> findByUserEmailAndActiveTrueOrderByNameAsc(
            String userEmail);

    Optional<Category> findByUserEmailAndNameIgnoreCase(
            String userEmail,
            String name);

    void deleteByUserEmailAndId(
            String userEmail,
            String id);
}


@Service
class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    private static final List<String> DEFAULT_CATEGORIES =
            List.of(
                    "Food",
                    "Travel",
                    "Education",
                    "Shopping",
                    "Bills",
                    "Other"
            );

    public List<Category> getCategories(String email) {

        List<Category> categories =
                categoryRepository
                        .findByUserEmailAndActiveTrueOrderByNameAsc(email);

        if (categories.isEmpty()) {

            for (String name : DEFAULT_CATEGORIES) {

                categoryRepository.save(
                        Category.builder()
                                .userEmail(email)
                                .name(name)
                                .custom(false)
                                .active(true)
                                .build()
                );
            }

            categories =
                    categoryRepository
                            .findByUserEmailAndActiveTrueOrderByNameAsc(
                                    email);
        }

        return categories;
    }

    public Category addCategory(
            String email,
            CategoryRequest request) {

        String name = request.getName().trim();

        if (categoryRepository
                .findByUserEmailAndNameIgnoreCase(email, name)
                .isPresent()) {

            throw new IllegalStateException(
                    "Category already exists");
        }

        return categoryRepository.save(
                Category.builder()
                        .userEmail(email)
                        .name(name)
                        .custom(true)
                        .active(true)
                        .build()
        );
    }

    public void deleteCategory(
            String email,
            String id) {

        Category category =
                categoryRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Category not found"));

        if (!category.getUserEmail().equals(email)) {
            throw new IllegalArgumentException(
                    "You cannot delete this category");
        }

        category.setActive(false);
        categoryRepository.save(category);
    }
}


@RestController
@RequestMapping("/api/categories")
class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    ResponseEntity<List<Category>> getCategories(
            Authentication authentication) {

        return ResponseEntity.ok(
                categoryService.getCategories(
                        authentication.getName()));
    }

    @PostMapping
    ResponseEntity<Category> addCategory(
            Authentication authentication,
            @Valid @RequestBody CategoryRequest request) {

        return ResponseEntity.ok(
                categoryService.addCategory(
                        authentication.getName(),
                        request));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse> deleteCategory(
            Authentication authentication,
            @PathVariable String id) {

        categoryService.deleteCategory(
                authentication.getName(),
                id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Category deleted"));
    }
}


// ============================================================
// 8. TRANSACTION MODULE
// ============================================================

@Document(collection = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Transaction {

    @org.springframework.data.annotation.Id
    private String id;

    private String userEmail;

    @NotNull
    private TransactionType type;

    @Positive
    private BigDecimal amount;

    private String category;

    private String description;

    private String paymentMethod;

    private String merchant;

    private LocalDate date;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder.Default
    private boolean reminderEnabled = false;

    private LocalDateTime reminderAt;

    @Builder.Default
    private boolean reminderSent = false;

    @Builder.Default
private RecurrenceFrequency recurrenceFrequency =
        RecurrenceFrequency.NONE;

@Builder.Default
private boolean recurringActive = false;

private LocalDate recurrenceEndDate;

private LocalDate nextRecurrenceDate;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class TransactionRequest {

    @NotNull(message = "Transaction type is required")
    private TransactionType type;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "Category is required")
    private String category;

    private String description;

    private String paymentMethod;

    private String merchant;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private boolean reminderEnabled;

    private LocalDateTime reminderAt;

    private RecurrenceFrequency recurrenceFrequency;
    
    private boolean recurringActive;
    
    private LocalDate recurrenceEndDate;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TransactionDto {

    private String id;
    private TransactionType type;
    private BigDecimal amount;
    private String category;
    private String description;
    private String paymentMethod;
    private String merchant;
    private LocalDate date;

    private boolean reminderEnabled;

    private LocalDateTime reminderAt;

    private boolean reminderSent;

    private RecurrenceFrequency recurrenceFrequency;

private boolean recurringActive;

private LocalDate recurrenceEndDate;

private LocalDate nextRecurrenceDate;
}


@Repository
interface TransactionRepository
        extends MongoRepository<Transaction, String> {
List<Transaction> findByRecurringActiveTrueAndNextRecurrenceDateLessThanEqual(
        LocalDate today);

    List<Transaction> findByUserEmailOrderByDateDescCreatedAtDesc(
            String userEmail);

    List<Transaction> findTop10ByUserEmailOrderByDateDescCreatedAtDesc(
            String userEmail);

    List<Transaction> findByUserEmailAndDateBetweenOrderByDateDesc(
            String userEmail,
            LocalDate start,
            LocalDate end);

    List<Transaction> findByUserEmailAndCategoryIgnoreCaseOrderByDateDesc(
            String userEmail,
            String category);

    List<Transaction> findByUserEmailAndTypeOrderByDateDesc(
            String userEmail,
            TransactionType type);

    List<Transaction> findByUserEmailAndDescriptionContainingIgnoreCaseOrderByDateDesc(
            String userEmail,
            String description);

    List<Transaction>
    findByReminderEnabledTrueAndReminderSentFalseAndReminderAtLessThanEqual(
            LocalDateTime now);
}


@Service
class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;
    
public TransactionDto add(
        String email,
        TransactionRequest request) {

    RecurrenceFrequency frequency =
            request.getRecurrenceFrequency() == null
                    ? RecurrenceFrequency.NONE
                    : request.getRecurrenceFrequency();

    boolean recurring =
            request.isRecurringActive()
                    && frequency != RecurrenceFrequency.NONE;

    Transaction transaction =
            Transaction.builder()
                    .userEmail(email)
                    .type(request.getType())
                    .amount(money(request.getAmount()))
                    .category(request.getCategory().trim())
                    .description(safe(request.getDescription()))
                    .paymentMethod(safe(request.getPaymentMethod()))
                    .merchant(safe(request.getMerchant()))
                    .date(request.getDate())
                    .reminderEnabled(request.isReminderEnabled())
                    .reminderAt(request.getReminderAt())
                    .reminderSent(false)
                    .recurrenceFrequency(frequency)
                    .recurringActive(recurring)
                    .recurrenceEndDate(request.getRecurrenceEndDate())
                    .nextRecurrenceDate(
                            recurring
                                    ? calculateNextRecurrenceDate(
                                            request.getDate(),
                                            frequency)
                                    : null)
                    .build();

    Transaction saved = transactionRepository.save(transaction);

    if (saved.getType() == TransactionType.EXPENSE) {
        notificationService.checkBudget(email);
    }

    return toDto(saved);
}

   public TransactionDto update(
        String email,
        String id,
        TransactionRequest request) {

    Transaction transaction = getOwned(email, id);

    // Update basic transaction details
    transaction.setType(request.getType());
    transaction.setAmount(money(request.getAmount()));
    transaction.setCategory(request.getCategory().trim());
    transaction.setDescription(safe(request.getDescription()));
    transaction.setPaymentMethod(safe(request.getPaymentMethod()));
    transaction.setMerchant(safe(request.getMerchant()));
    transaction.setDate(request.getDate());

    // Update reminder details
    transaction.setReminderEnabled(request.isReminderEnabled());
    transaction.setReminderAt(request.getReminderAt());
    transaction.setReminderSent(false);

    // Update recurrence details
    RecurrenceFrequency frequency =
            request.getRecurrenceFrequency() == null
                    ? RecurrenceFrequency.NONE
                    : request.getRecurrenceFrequency();

    boolean recurring =
            request.isRecurringActive()
                    && frequency != RecurrenceFrequency.NONE;

    transaction.setRecurrenceFrequency(frequency);
    transaction.setRecurringActive(recurring);
    transaction.setRecurrenceEndDate(request.getRecurrenceEndDate());

    // Calculate the next recurrence date
    LocalDate nextDate = recurring
            ? calculateNextRecurrenceDate(
                    request.getDate(),
                    frequency)
            : null;

    // Stop recurrence if the next date is after the end date
    if (recurring
            && request.getRecurrenceEndDate() != null
            && nextDate.isAfter(request.getRecurrenceEndDate())) {

        recurring = false;
        nextDate = null;
    }

    transaction.setRecurringActive(recurring);
    transaction.setNextRecurrenceDate(nextDate);

    // Save updated transaction
    Transaction saved =
            transactionRepository.save(transaction);

    // Recheck budget after updating an expense
    if (saved.getType() == TransactionType.EXPENSE) {
        notificationService.checkBudget(email);
    }

    return toDto(saved);
}

    public TransactionDto get(
            String email,
            String id) {

        return toDto(getOwned(email, id));
    }

    public List<TransactionDto> getAll(
            String email) {

        return transactionRepository
                .findByUserEmailOrderByDateDescCreatedAtDesc(email)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<TransactionDto> recent(
            String email) {

        return transactionRepository
                .findTop10ByUserEmailOrderByDateDescCreatedAtDesc(email)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<TransactionDto> byDate(
            String email,
            LocalDate start,
            LocalDate end) {

        return transactionRepository
                .findByUserEmailAndDateBetweenOrderByDateDesc(
                        email, start, end)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<TransactionDto> byCategory(
            String email,
            String category) {

        return transactionRepository
                .findByUserEmailAndCategoryIgnoreCaseOrderByDateDesc(
                        email, category)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<TransactionDto> byType(
            String email,
            TransactionType type) {

        return transactionRepository
                .findByUserEmailAndTypeOrderByDateDesc(
                        email, type)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<TransactionDto> search(
            String email,
            String description) {

        return transactionRepository
                .findByUserEmailAndDescriptionContainingIgnoreCaseOrderByDateDesc(
                        email, description)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public void delete(
            String email,
            String id) {

        Transaction transaction =
                getOwned(email, id);

        transactionRepository.delete(transaction);
    }

    private Transaction getOwned(
            String email,
            String id) {

        Transaction transaction =
                transactionRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Transaction not found"));

        if (!transaction.getUserEmail().equals(email)) {
            throw new IllegalArgumentException(
                    "You cannot access this transaction");
        }

        return transaction;
    }

    private TransactionDto toDto(
            Transaction transaction) {

        return TransactionDto.builder()
                .id(transaction.getId())
                .type(transaction.getType())
                .amount(transaction.getAmount())
                .category(transaction.getCategory())
                .description(transaction.getDescription())
                .paymentMethod(transaction.getPaymentMethod())
                .merchant(transaction.getMerchant())
                .date(transaction.getDate())
                .reminderEnabled(transaction.isReminderEnabled())
.reminderAt(transaction.getReminderAt())
.reminderSent(transaction.isReminderSent())

.recurrenceFrequency(
        transaction.getRecurrenceFrequency()
)

.recurringActive(
        transaction.isRecurringActive()
)

.recurrenceEndDate(
        transaction.getRecurrenceEndDate()
)

.nextRecurrenceDate(
        transaction.getNextRecurrenceDate()
)

.build();
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
    private LocalDate calculateNextRecurrenceDate(
        LocalDate transactionDate,
        RecurrenceFrequency frequency) {

    if (transactionDate == null || frequency == null) {
        return null;
    }

    return switch (frequency) {
        case DAILY -> transactionDate.plusDays(1);
        case WEEKLY -> transactionDate.plusWeeks(1);
        case MONTHLY -> transactionDate.plusMonths(1);
        case YEARLY -> transactionDate.plusYears(1);
        case NONE -> null;
    };
}
}


@RestController
@RequestMapping("/api/transactions")
class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @PostMapping
    ResponseEntity<TransactionDto> add(
            Authentication authentication,
            @Valid @RequestBody TransactionRequest request) {

        return ResponseEntity.ok(
                transactionService.add(
                        authentication.getName(),
                        request));
    }

    @GetMapping
    ResponseEntity<List<TransactionDto>> getAll(
            Authentication authentication) {

        return ResponseEntity.ok(
                transactionService.getAll(
                        authentication.getName()));
    }

    @GetMapping("/recent")
    ResponseEntity<List<TransactionDto>> recent(
            Authentication authentication) {

        return ResponseEntity.ok(
                transactionService.recent(
                        authentication.getName()));
    }

    @GetMapping("/{id}")
    ResponseEntity<TransactionDto> get(
            Authentication authentication,
            @PathVariable String id) {

        return ResponseEntity.ok(
                transactionService.get(
                        authentication.getName(),
                        id));
    }

    @PutMapping("/{id}")
    ResponseEntity<TransactionDto> update(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody TransactionRequest request) {

        return ResponseEntity.ok(
                transactionService.update(
                        authentication.getName(),
                        id,
                        request));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse> delete(
            Authentication authentication,
            @PathVariable String id) {

        transactionService.delete(
                authentication.getName(),
                id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Transaction deleted"));
    }

    @GetMapping("/search")
    ResponseEntity<List<TransactionDto>> search(
            Authentication authentication,
            @RequestParam String description) {

        return ResponseEntity.ok(
                transactionService.search(
                        authentication.getName(),
                        description));
    }

    @GetMapping("/category/{category}")
    ResponseEntity<List<TransactionDto>> category(
            Authentication authentication,
            @PathVariable String category) {

        return ResponseEntity.ok(
                transactionService.byCategory(
                        authentication.getName(),
                        category));
    }

    @GetMapping("/type/{type}")
    ResponseEntity<List<TransactionDto>> type(
            Authentication authentication,
            @PathVariable TransactionType type) {

        return ResponseEntity.ok(
                transactionService.byType(
                        authentication.getName(),
                        type));
    }

    @GetMapping("/date-range")
    ResponseEntity<List<TransactionDto>> dateRange(
            Authentication authentication,
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {

        return ResponseEntity.ok(
                transactionService.byDate(
                        authentication.getName(),
                        start,
                        end));
    }
}


// ============================================================
// 9. BUDGET MODULE
// ============================================================

@Document(collection = "budgets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Budget {

    @org.springframework.data.annotation.Id
    private String id;

    private String userEmail;

    private int year;

    private int month;

    private String category;

    private BigDecimal amount;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class BudgetRequest {

    @NotNull(message = "Budget amount is required")
    @Positive(message = "Budget must be greater than zero")
    private BigDecimal amount;

    @NotNull(message = "Year is required")
    private Integer year;

    @NotNull(message = "Month is required")
    private Integer month;
    private String category;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class BudgetStatus {

    private String id;
    private int year;
    private int month;
    private BigDecimal budget;
    private BigDecimal spent;
    private BigDecimal remaining;
    private double percentage;
    private String status;
    private String category;
}


@Repository
interface BudgetRepository
        extends MongoRepository<Budget, String> {

    List<Budget> findByUserEmailOrderByYearDescMonthDesc(
            String userEmail);
        Optional<Budget> findByUserEmailAndYearAndMonthAndCategory(
        String userEmail,
        int year,
        int month,
        String category);

        Optional<Budget> findByUserEmailAndYearAndMonthAndCategoryIsNull(
        String userEmail,
        int year,
        int month);

        List<Budget> findByUserEmailAndYearAndMonth(
                 String userEmail, int year, int month
        );
}


@Service
class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    public BudgetStatus save(
            String email,
            BudgetRequest request) {

        if (request.getMonth() < 1 ||
                request.getMonth() > 12) {

            throw new IllegalArgumentException(
                    "Month must be between 1 and 12");
        }

        String category = request.getCategory();

if (category != null && category.isBlank()) {
    category = null;
}

Optional<Budget> existing;

if (category == null) {
    existing = budgetRepository
        .findByUserEmailAndYearAndMonthAndCategoryIsNull(
                email,
                request.getYear(),
                request.getMonth());
} else {
    category = category.trim();

    existing = budgetRepository
            .findByUserEmailAndYearAndMonthAndCategory(
                    email,
                    request.getYear(),
                    request.getMonth(),
                    category);
}

Budget budget = existing.orElse(
        Budget.builder()
                .userEmail(email)
                .category(category)
                .year(request.getYear())
                .month(request.getMonth())
                .build()
        );

        budget.setAmount(
                request.getAmount()
                        .setScale(2, RoundingMode.HALF_UP));

        return getStatus(
                email,
                budgetRepository.save(budget));
    }

    public List<BudgetStatus> getAll(
            String email) {

        return budgetRepository
                .findByUserEmailOrderByYearDescMonthDesc(email)
                .stream()
                .map(b -> getStatus(email, b))
                .toList();
    }

    public BudgetStatus current(String email) {
    YearMonth now = YearMonth.now();

    Budget budget = budgetRepository
            .findByUserEmailAndYearAndMonthAndCategory(
                    email,
                    now.getYear(),
                    now.getMonthValue(),
                    null
            )
            .orElse(
                    Budget.builder()
                            .userEmail(email)
                            .year(now.getYear())
                            .month(now.getMonthValue())
                            .category(null)
                            .amount(BigDecimal.ZERO)
                            .build()
            );

    return getStatus(email, budget);
}

    public BudgetStatus update(
        String email,
        String id,
        BudgetRequest request) {

    Budget budget = getOwned(email, id);

    String category = request.getCategory();

    if (category != null) {
        category = category.trim();

        if (category.isEmpty()) {
            category = null;
        }
    }

    budget.setAmount(
            request.getAmount().setScale(2, RoundingMode.HALF_UP)
    );
    budget.setYear(request.getYear());
    budget.setMonth(request.getMonth());
    budget.setCategory(category);

    return getStatus(
            email,
            budgetRepository.save(budget)
    );
}


    public void delete(
            String email,
            String id) {

        budgetRepository.delete(
                getOwned(email, id));
    }

    private BudgetStatus getStatus(
            String email,
            Budget budget) {

        LocalDate start =
                LocalDate.of(
                        budget.getYear(),
                        budget.getMonth(),
                        1);

        LocalDate end =
                start.withDayOfMonth(
                        start.lengthOfMonth());

        BigDecimal spent =
                transactionRepository
                        .findByUserEmailAndDateBetweenOrderByDateDesc(
                                email, start, end)
                        .stream()
                        .filter(t ->
    budget.getCategory() == null ||
    (t.getCategory() != null &&
     t.getCategory().equalsIgnoreCase(budget.getCategory())))
                        .map(Transaction::getAmount)
                        .reduce(BigDecimal.ZERO,
                                BigDecimal::add);

        BigDecimal amount =
                budget.getAmount() == null
                        ? BigDecimal.ZERO
                        : budget.getAmount();

        BigDecimal remaining =
                amount.subtract(spent);

        double percentage = amount.signum() == 0
                ? 0
                : spent.doubleValue()
                    / amount.doubleValue() * 100;

        String status;

        if (percentage >= 100) {
            status = "EXCEEDED";
        } else if (percentage >= 80) {
            status = "WARNING";
        } else {
            status = "SAFE";
        }

        return BudgetStatus.builder()
                .id(budget.getId())
                .year(budget.getYear())
                .month(budget.getMonth())
                .budget(amount)
                .spent(spent)
                .remaining(remaining)
                .percentage(
                        Math.round(percentage * 100.0) / 100.0)
                .status(status)
                .category(budget.getCategory())
                .build();
    }

    private Budget getOwned(
            String email,
            String id) {

        Budget budget =
                budgetRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Budget not found"));

        if (!budget.getUserEmail().equals(email)) {
            throw new IllegalArgumentException(
                    "You cannot access this budget");
        }

        return budget;
    }
}


@RestController
@RequestMapping("/api/budgets")
class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @PostMapping
    ResponseEntity<BudgetStatus> create(
            Authentication authentication,
            @Valid @RequestBody BudgetRequest request) {

        return ResponseEntity.ok(
                budgetService.save(
                        authentication.getName(),
                        request));
    }

    @GetMapping
    ResponseEntity<List<BudgetStatus>> getAll(
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.getAll(
                        authentication.getName()));
    }

    @GetMapping("/current")
    ResponseEntity<BudgetStatus> current(
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.current(
                        authentication.getName()));
    }

    @PutMapping("/{id}")
    ResponseEntity<BudgetStatus> update(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody BudgetRequest request) {

        return ResponseEntity.ok(
                budgetService.update(
                        authentication.getName(),
                        id,
                        request));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse> delete(
            Authentication authentication,
            @PathVariable String id) {

        budgetService.delete(
                authentication.getName(),
                id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Budget deleted"));
    }
}


// ============================================================
// 10. SAVING GOALS MODULE
// ============================================================

@Document(collection = "saving_goals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SavingGoal {

    @org.springframework.data.annotation.Id
    private String id;

    private String userEmail;

    private String name;

    private BigDecimal targetAmount;

    @Builder.Default
    private BigDecimal savedAmount = BigDecimal.ZERO;

    private LocalDate targetDate;

    private String description;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class GoalRequest {

    @NotBlank(message = "Goal name is required")
    private String name;

    @NotNull
    @Positive
    private BigDecimal targetAmount;

    private LocalDate targetDate;

    private String description;
}


@Data
@NoArgsConstructor
@AllArgsConstructor
class AddSavingsRequest {

    @NotNull
    @Positive
    private BigDecimal amount;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class GoalDto {

    private String id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal savedAmount;
    private BigDecimal remaining;
    private double percentage;
    private LocalDate targetDate;
    private String description;
}


@Repository
interface SavingGoalRepository
        extends MongoRepository<SavingGoal, String> {

    List<SavingGoal> findByUserEmailOrderByTargetDateAsc(
            String userEmail);
}


@Service
class GoalService {

    @Autowired
    private SavingGoalRepository goalRepository;

    @Autowired
    private NotificationService notificationService;

    public GoalDto create(
            String email,
            GoalRequest request) {

        SavingGoal goal =
                SavingGoal.builder()
                        .userEmail(email)
                        .name(request.getName().trim())
                        .targetAmount(request.getTargetAmount())
                        .savedAmount(BigDecimal.ZERO)
                        .targetDate(request.getTargetDate())
                        .description(
                                request.getDescription() == null
                                        ? ""
                                        : request.getDescription().trim())
                        .build();

        return toDto(
                goalRepository.save(goal));
    }

    public List<GoalDto> getAll(
            String email) {

        return goalRepository
                .findByUserEmailOrderByTargetDateAsc(email)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public GoalDto update(
            String email,
            String id,
            GoalRequest request) {

        SavingGoal goal =
                getOwned(email, id);

        goal.setName(request.getName().trim());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setTargetDate(request.getTargetDate());
        goal.setDescription(
                request.getDescription() == null
                        ? ""
                        : request.getDescription().trim());

        return toDto(
                goalRepository.save(goal));
    }

    public GoalDto addSavings(
            String email,
            String id,
            AddSavingsRequest request) {

        SavingGoal goal =
                getOwned(email, id);

        goal.setSavedAmount(
                goal.getSavedAmount()
                        .add(request.getAmount()));

        if (goal.getSavedAmount()
                .compareTo(goal.getTargetAmount()) > 0) {

            goal.setSavedAmount(
                    goal.getTargetAmount());
        }

        SavingGoal saved = goalRepository.save(goal);
        notificationService.checkSavingGoal(
        email,
        saved.getId());
        return toDto(saved);
    }

    public void delete(
            String email,
            String id) {

        goalRepository.delete(
                getOwned(email, id));
    }

    private SavingGoal getOwned(
            String email,
            String id) {

        SavingGoal goal =
                goalRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Saving goal not found"));

        if (!goal.getUserEmail().equals(email)) {
            throw new IllegalArgumentException(
                    "You cannot access this goal");
        }

        return goal;
    }

    private GoalDto toDto(
            SavingGoal goal) {

        BigDecimal target =
                goal.getTargetAmount();

        BigDecimal saved =
                goal.getSavedAmount() == null
                        ? BigDecimal.ZERO
                        : goal.getSavedAmount();

        BigDecimal remaining =
                target.subtract(saved);

        double percentage =
                target.signum() == 0
                        ? 0
                        : saved.doubleValue()
                            / target.doubleValue() * 100;

        return GoalDto.builder()
                .id(goal.getId())
                .name(goal.getName())
                .targetAmount(target)
                .savedAmount(saved)
                .remaining(
                        remaining.max(BigDecimal.ZERO))
                .percentage(
                        Math.round(percentage * 100.0)
                                / 100.0)
                .targetDate(goal.getTargetDate())
                .description(goal.getDescription())
                .build();
    }
}


@RestController
@RequestMapping("/api/goals")
class GoalController {

    @Autowired
    private GoalService goalService;

    @PostMapping
    ResponseEntity<GoalDto> create(
            Authentication authentication,
            @Valid @RequestBody GoalRequest request) {

        return ResponseEntity.ok(
                goalService.create(
                        authentication.getName(),
                        request));
    }

    @GetMapping
    ResponseEntity<List<GoalDto>> getAll(
            Authentication authentication) {

        return ResponseEntity.ok(
                goalService.getAll(
                        authentication.getName()));
    }

    @PutMapping("/{id}")
    ResponseEntity<GoalDto> update(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody GoalRequest request) {

        return ResponseEntity.ok(
                goalService.update(
                        authentication.getName(),
                        id,
                        request));
    }

    @PostMapping("/{id}/add-savings")
    ResponseEntity<GoalDto> addSavings(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody AddSavingsRequest request) {

        return ResponseEntity.ok(
                goalService.addSavings(
                        authentication.getName(),
                        id,
                        request));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse> delete(
            Authentication authentication,
            @PathVariable String id) {

        goalService.delete(
                authentication.getName(),
                id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Goal deleted"));
    }
}
// ============================================================
// 11. NOTIFICATION MODULE
// ============================================================

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Notification {

    @org.springframework.data.annotation.Id
    private String id;

    private String userEmail;

    private String title;

    private String message;

    private String type;

    @Builder.Default
    private boolean read = false;

    /*
     * Used to prevent duplicate automatic notifications.
     *
     * Examples:
     * BUDGET:budgetId:80
     * BUDGET:budgetId:90
     * BUDGET:budgetId:100
     * GOAL:goalId:ACHIEVED
     */
    private String alertKey;

    @CreatedDate
    private LocalDateTime createdAt;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class NotificationDto {

    private String id;

    private String title;

    private String message;

    private String type;

    private boolean read;

    private LocalDateTime createdAt;
}


@Repository
interface NotificationRepository
        extends MongoRepository<Notification, String> {

    List<Notification> findByUserEmailOrderByCreatedAtDesc(
            String userEmail);

    List<Notification> findByUserEmailAndReadFalseOrderByCreatedAtDesc(
            String userEmail);

    long countByUserEmailAndReadFalse(
            String userEmail);

    Optional<Notification> findByUserEmailAndAlertKey(
            String userEmail,
            String alertKey);
}


@Service
class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendNotification(
            String to,
            String subject,
            String message) {

        if (to == null || to.trim().isEmpty()) {
            return;
        }

        try {
            SimpleMailMessage mail =
                    new SimpleMailMessage();

            mail.setTo(to);
            mail.setSubject(subject);
            mail.setText(message);

            mailSender.send(mail);

            System.out.println(
                    "FinPocket email notification sent to " + to);

        } catch (Exception e) {
            System.err.println(
                    "FinPocket email notification failed for "
                            + to + ": " + e.getMessage());
        }
    }
}


@Service
class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SavingGoalRepository savingGoalRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;


    // ========================================================
    // GET NOTIFICATIONS
    // ========================================================

    public List<NotificationDto> getAll(
            String email) {

        return notificationRepository
                .findByUserEmailOrderByCreatedAtDesc(email)
                .stream()
                .map(this::toDto)
                .toList();
    }


    // ========================================================
    // GET UNREAD COUNT
    // ========================================================

    public long getUnreadCount(
            String email) {

        return notificationRepository
                .countByUserEmailAndReadFalse(email);
    }


    // ========================================================
    // MARK AS READ
    // ========================================================

    public NotificationDto markAsRead(
            String email,
            String id) {

        Notification notification =
                getOwned(email, id);

        notification.setRead(true);

        Notification saved =
                notificationRepository.save(notification);


        return toDto(saved);
    }


    // ========================================================
    // MARK ALL AS READ
    // ========================================================

    public void markAllAsRead(
            String email) {

        List<Notification> notifications =
                notificationRepository
                        .findByUserEmailAndReadFalseOrderByCreatedAtDesc(
                                email);

        for (Notification notification : notifications) {

            notification.setRead(true);

        }

        notificationRepository.saveAll(notifications);
    }


    // ========================================================
    // DELETE NOTIFICATION
    // ========================================================

    public void delete(
            String email,
            String id) {

        notificationRepository.delete(
                getOwned(email, id));
    }


    // ========================================================
    // CREATE NOTIFICATION
    // ========================================================

    public NotificationDto create(
            String email,
            String title,
            String message,
            String type,
            String alertKey) {

        /*
         * Do not create duplicate automatic alerts.
         */

        if (alertKey != null &&
                notificationRepository
                        .findByUserEmailAndAlertKey(
                                email,
                                alertKey)
                        .isPresent()) {

            return null;
        }


        Notification notification =
                Notification.builder()
                        .userEmail(email)
                        .title(title)
                        .message(message)
                        .type(type)
                        .read(false)
                        .alertKey(alertKey)
                        .createdAt(LocalDateTime.now())
                        .build();


        return toDto(
                notificationRepository.save(notification));
    }


    // ========================================================
    // CHECK BUDGET
    // ========================================================

    public void checkBudget(
            String email) {

        YearMonth currentMonth =
                YearMonth.now();


                Optional<Budget> budgetOptional =
        budgetRepository
                .findByUserEmailAndYearAndMonthAndCategoryIsNull(
                        email,
                        currentMonth.getYear(),
                        currentMonth.getMonthValue());


        if (budgetOptional.isEmpty()) {
            return;
        }


        Budget budget =
                budgetOptional.get();


        LocalDate start =
                currentMonth
                        .atDay(1);


        LocalDate end =
                currentMonth
                        .atEndOfMonth();


        BigDecimal spent =
                transactionRepository
                        .findByUserEmailAndDateBetweenOrderByDateDesc(
                                email,
                                start,
                                end)
                        .stream()
                        .filter(t ->
                                t.getType() ==
                                        TransactionType.EXPENSE)
                        .map(Transaction::getAmount)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add);


        BigDecimal budgetAmount =
                budget.getAmount() == null
                        ? BigDecimal.ZERO
                        : budget.getAmount();


        if (budgetAmount.signum() == 0) {
            return;
        }


        double percentage =
                spent.doubleValue()
                        / budgetAmount.doubleValue()
                        * 100;


        String monthName =
                currentMonth.getMonth()
                        .getDisplayName(
                                java.time.format.TextStyle.FULL,
                                Locale.ENGLISH);


        // ====================================================
        // 100% EXCEEDED
        // ====================================================

        if (percentage >= 100) {

            BigDecimal exceededBy =
                    spent.subtract(budgetAmount);


            create(
                    email,

                    "🚨 Budget Exceeded",

                    "Your " +
                            monthName +
                            " budget has been exceeded by " +
                            formatMoney(exceededBy) +
                            ". Total spending is " +
                            formatMoney(spent) +
                            " against a budget of " +
                            formatMoney(budgetAmount) +
                            ".",

                    "BUDGET_EXCEEDED",

                    "BUDGET:" +
                            budget.getId() +
                            ":100"
            );

            return;
        }


        // ====================================================
        // 90% WARNING
        // ====================================================

        if (percentage >= 90) {

            BigDecimal remaining =
                    budgetAmount.subtract(spent);


            create(
                    email,

                    "⚠️ Budget Almost Reached",

                    "You have used " +
                            String.format(
                                    Locale.US,
                                    "%.1f",
                                    percentage) +
                            "% of your " +
                            monthName +
                            " budget. Only " +
                            formatMoney(remaining) +
                            " remains.",

                    "BUDGET_WARNING",

                    "BUDGET:" +
                            budget.getId() +
                            ":90"
            );

            return;
        }


        // ====================================================
        // 80% WARNING
        // ====================================================

        if (percentage >= 80) {

            BigDecimal remaining =
                    budgetAmount.subtract(spent);


            create(
                    email,

                    "🔔 Budget Warning",

                    "You have used " +
                            String.format(
                                    Locale.US,
                                    "%.1f",
                                    percentage) +
                            "% of your " +
                            monthName +
                            " budget. " +
                            formatMoney(remaining) +
                            " remains.",

                    "BUDGET_WARNING",

                    "BUDGET:" +
                            budget.getId() +
                            ":80"
            );
        }
    }


    // ========================================================
    // CHECK SAVING GOAL
    // ========================================================

    public void checkSavingGoal(
            String email,
            String goalId) {

        Optional<SavingGoal> goalOptional =
                savingGoalRepository.findById(goalId);


        if (goalOptional.isEmpty()) {
            return;
        }


        SavingGoal goal =
                goalOptional.get();


        if (!goal.getUserEmail().equals(email)) {
            return;
        }


        if (goal.getTargetAmount() == null ||
                goal.getSavedAmount() == null) {
            return;
        }


        if (goal.getSavedAmount()
                .compareTo(
                        goal.getTargetAmount()) >= 0) {

            create(
                    email,

                    "🏆 Saving Goal Achieved!",

                    "Congratulations! You have reached your saving goal \"" +
                            goal.getName() +
                            "\" with " +
                            formatMoney(
                                    goal.getTargetAmount()) +
                            " saved.",

                    "GOAL_ACHIEVED",

                    "GOAL:" +
                            goal.getId() +
                            ":ACHIEVED"
            );
        }
    }


    // ========================================================
    // OWNERSHIP CHECK
    // ========================================================

    private Notification getOwned(
            String email,
            String id) {

        Notification notification =
                notificationRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Notification not found"));


        if (!notification.getUserEmail()
                .equals(email)) {

            throw new IllegalArgumentException(
                    "You cannot access this notification");
        }


        return notification;
    }


    // ========================================================
    // DTO
    // ========================================================

    private NotificationDto toDto(
            Notification notification) {

        return NotificationDto.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }


    // ========================================================
    // MONEY FORMAT
    // ========================================================

    private String formatMoney(
            BigDecimal amount) {

        return "₹" +
                amount.setScale(
                        2,
                        RoundingMode.HALF_UP)
                        .toPlainString();
    }
}
@RestController
@RequestMapping("/api/notifications")
class NotificationController {

    @Autowired
    private NotificationService notificationService;


    // ========================================================
    // GET ALL
    // ========================================================

    @GetMapping
    ResponseEntity<List<NotificationDto>> getAll(
            Authentication authentication) {

        return ResponseEntity.ok(
                notificationService.getAll(
                        authentication.getName()));
    }


    // ========================================================
    // UNREAD COUNT
    // ========================================================

    @GetMapping("/unread-count")
    ResponseEntity<Map<String, Long>> unreadCount(
            Authentication authentication) {

        long count =
                notificationService.getUnreadCount(
                        authentication.getName());

        return ResponseEntity.ok(
                Map.of("count", count));
    }


    // ========================================================
    // MARK ONE AS READ
    // ========================================================

    @PutMapping("/{id}/read")
    ResponseEntity<NotificationDto> markAsRead(
            Authentication authentication,
            @PathVariable String id) {

        return ResponseEntity.ok(
                notificationService.markAsRead(
                        authentication.getName(),
                        id));
    }


    // ========================================================
    // MARK ALL AS READ
    // ========================================================

    @PutMapping("/read-all")
    ResponseEntity<ApiResponse> markAllAsRead(
            Authentication authentication) {

        notificationService.markAllAsRead(
                authentication.getName());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "All notifications marked as read"));
    }


    // ========================================================
    // DELETE
    // ========================================================

    @DeleteMapping("/{id}")
    ResponseEntity<ApiResponse> delete(
            Authentication authentication,
            @PathVariable String id) {

        notificationService.delete(
                authentication.getName(),
                id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Notification deleted"));
    }
}
// ============================================================
// 12. DASHBOARD MODULE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DashboardResponse {

    private String fullName;

    @Builder.Default
    private BigDecimal totalBalance = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalIncome = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalExpenses = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal currentBudget = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal currentBudgetSpent = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal currentBudgetRemaining = BigDecimal.ZERO;

    @Builder.Default
    private List<TransactionDto> recentTransactions =
            new ArrayList<>();

    @Builder.Default
    private List<GoalDto> goals =
            new ArrayList<>();
}


@Service
class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private GoalService goalService;

    public UserDto getCurrentUser(
            String email) {

        return toDto(
                getUser(email));
    }

    public DashboardResponse getDashboard(
            String email) {

        User user = getUser(email);

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailOrderByDateDescCreatedAtDesc(
                                email);

        BigDecimal income =
                sum(transactions, TransactionType.INCOME);

        BigDecimal expenses =
                sum(transactions, TransactionType.EXPENSE);

        BudgetStatus budget =
                budgetService.current(email);

        return DashboardResponse.builder()
                .fullName(user.getFullName())
                .totalIncome(income)
                .totalExpenses(expenses)
                .totalBalance(
                        income.subtract(expenses))
                .currentBudget(budget.getBudget())
                .currentBudgetSpent(budget.getSpent())
                .currentBudgetRemaining(
                        budget.getRemaining())
                .recentTransactions(
                        transactions.stream()
                                .limit(10)
                                .map(t ->
                                        TransactionDto.builder()
                                                .id(t.getId())
                                                .type(t.getType())
                                                .amount(t.getAmount())
                                                .category(t.getCategory())
                                                .description(t.getDescription())
                                                .paymentMethod(t.getPaymentMethod())
                                                .merchant(t.getMerchant())
                                                .date(t.getDate())
                                                .build())
                                .toList())
                .goals(goalService.getAll(email))
                .build();
    }

    public UserDto updateProfile(
            String email,
            ProfileUpdateRequest request) {

        User user = getUser(email);

        user.setFullName(
                request.getFullName().trim());

        user.setPhone(
                request.getPhone() == null
                        ? ""
                        : request.getPhone().trim());

        return toDto(
                userRepository.save(user));
    }

    private User getUser(String email) {

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "User not found"));
    }

    private BigDecimal sum(
            List<Transaction> transactions,
            TransactionType type) {

        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO,
                        BigDecimal::add);
    }

    private UserDto toDto(User user) {

        return UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}


@RestController
@RequestMapping("/api/user")
class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    ResponseEntity<UserDto> me(
            Authentication authentication) {

        return ResponseEntity.ok(
                userService.getCurrentUser(
                        authentication.getName()));
    }

    @GetMapping("/dashboard")
    ResponseEntity<DashboardResponse> dashboard(
            Authentication authentication) {

        return ResponseEntity.ok(
                userService.getDashboard(
                        authentication.getName()));
    }

    @PutMapping("/profile")
    ResponseEntity<UserDto> updateProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {

        return ResponseEntity.ok(
                userService.updateProfile(
                        authentication.getName(),
                        request));
    }
}


// ============================================================
// 12. ANALYTICS MODULE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AnalyticsSummary {

    private BigDecimal totalIncome;
    private BigDecimal totalExpenses;
    private BigDecimal balance;
    private BigDecimal averageDailyExpense;
    private String highestSpendingCategory;
    private BigDecimal highestCategoryAmount;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class CategorySpending {

    private String category;
    private BigDecimal amount;
    private double percentage;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class MonthlySpending {

    private String month;
    private BigDecimal income;
    private BigDecimal expenses;
    private BigDecimal balance;
}


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DailySpending {

    private LocalDate date;
    private BigDecimal amount;
}


@Service
class AnalyticsService {

    @Autowired
    private TransactionRepository transactionRepository;

    public AnalyticsSummary summary(
            String email) {

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailOrderByDateDescCreatedAtDesc(
                                email);

        BigDecimal income =
                sum(transactions, TransactionType.INCOME);

        BigDecimal expenses =
                sum(transactions, TransactionType.EXPENSE);

        Map<String, BigDecimal> categories =
                categoryAmounts(transactions);

        String highestCategory = null;
        BigDecimal highestAmount = BigDecimal.ZERO;

        for (Map.Entry<String, BigDecimal> entry :
                categories.entrySet()) {

            if (entry.getValue()
                    .compareTo(highestAmount) > 0) {

                highestCategory = entry.getKey();
                highestAmount = entry.getValue();
            }
        }

        Set<LocalDate> expenseDays =
                transactions.stream()
                        .filter(t ->
                                t.getType() ==
                                        TransactionType.EXPENSE)
                        .map(Transaction::getDate)
                        .collect(Collectors.toSet());

        BigDecimal averageDaily =
                expenseDays.isEmpty()
                        ? BigDecimal.ZERO
                        : expenses.divide(
                                BigDecimal.valueOf(
                                        expenseDays.size()),
                                2,
                                RoundingMode.HALF_UP);

        return AnalyticsSummary.builder()
                .totalIncome(income)
                .totalExpenses(expenses)
                .balance(income.subtract(expenses))
                .averageDailyExpense(averageDaily)
                .highestSpendingCategory(highestCategory)
                .highestCategoryAmount(highestAmount)
                .build();
    }

    public List<CategorySpending> categorySpending(
            String email) {

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailOrderByDateDescCreatedAtDesc(
                                email);

        BigDecimal total =
                sum(transactions, TransactionType.EXPENSE);

        Map<String, BigDecimal> categories =
                categoryAmounts(transactions);

        return categories.entrySet()
                .stream()
                .map(entry -> {

                    double percentage =
                            total.signum() == 0
                                    ? 0
                                    : entry.getValue()
                                            .doubleValue()
                                            / total.doubleValue()
                                            * 100;

                    return CategorySpending.builder()
                            .category(entry.getKey())
                            .amount(entry.getValue())
                            .percentage(
                                    Math.round(
                                            percentage * 100.0)
                                            / 100.0)
                            .build();
                })
                .sorted(Comparator.comparing(
                        CategorySpending::getAmount)
                        .reversed())
                .toList();
    }

    public List<MonthlySpending> monthlySpending(
            String email) {

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailOrderByDateDescCreatedAtDesc(
                                email);

        Map<YearMonth, List<Transaction>> grouped =
                transactions.stream()
                        .collect(Collectors.groupingBy(
                                t -> YearMonth.from(t.getDate()),
                                TreeMap::new,
                                Collectors.toList()));

        return grouped.entrySet()
                .stream()
                .map(entry -> {

                    BigDecimal income =
                            sum(entry.getValue(),
                                    TransactionType.INCOME);

                    BigDecimal expenses =
                            sum(entry.getValue(),
                                    TransactionType.EXPENSE);

                    return MonthlySpending.builder()
                            .month(entry.getKey().toString())
                            .income(income)
                            .expenses(expenses)
                            .balance(
                                    income.subtract(expenses))
                            .build();
                })
                .sorted(Comparator.comparing(
                        MonthlySpending::getMonth))
                .toList();
    }

    public List<DailySpending> dailySpending(
            String email,
            LocalDate start,
            LocalDate end) {

        return transactionRepository
                .findByUserEmailAndDateBetweenOrderByDateDesc(
                        email, start, end)
                .stream()
                .filter(t ->
                        t.getType() ==
                                TransactionType.EXPENSE)
                .collect(Collectors.groupingBy(
                        Transaction::getDate,
                        TreeMap::new,
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                Transaction::getAmount,
                                BigDecimal::add)))
                .entrySet()
                .stream()
                .map(e ->
                        DailySpending.builder()
                                .date(e.getKey())
                                .amount(e.getValue())
                                .build())
                .toList();
    }

    private Map<String, BigDecimal> categoryAmounts(
            List<Transaction> transactions) {

        return transactions.stream()
                .filter(t ->
                        t.getType() ==
                                TransactionType.EXPENSE)
                .collect(Collectors.groupingBy(
                        Transaction::getCategory,
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                Transaction::getAmount,
                                BigDecimal::add)));
    }

    private BigDecimal sum(
            List<Transaction> transactions,
            TransactionType type) {

        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO,
                        BigDecimal::add);
    }
}


@RestController
@RequestMapping("/api/analytics")
class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/summary")
    ResponseEntity<AnalyticsSummary> summary(
            Authentication authentication) {

        return ResponseEntity.ok(
                analyticsService.summary(
                        authentication.getName()));
    }

    @GetMapping("/category")
    ResponseEntity<List<CategorySpending>> category(
            Authentication authentication) {

        return ResponseEntity.ok(
                analyticsService.categorySpending(
                        authentication.getName()));
    }

    @GetMapping("/monthly")
    ResponseEntity<List<MonthlySpending>> monthly(
            Authentication authentication) {

        return ResponseEntity.ok(
                analyticsService.monthlySpending(
                        authentication.getName()));
    }

    @GetMapping("/daily")
    ResponseEntity<List<DailySpending>> daily(
            Authentication authentication,
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {

        return ResponseEntity.ok(
                analyticsService.dailySpending(
                        authentication.getName(),
                        start,
                        end));
    }
}


// ============================================================
// 13. REPORT MODULE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class FinancialReport {

    private String period;

    private BigDecimal income;

    private BigDecimal expenses;

    private BigDecimal savings;

    private BigDecimal averageExpense;

    private List<CategorySpending> categoryBreakdown;

    private List<MonthlySpending> monthlyBreakdown;
}


@Service
class ReportService {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TransactionRepository transactionRepository;

    public FinancialReport monthlyReport(
            String email,
            int year,
            int month) {

        LocalDate start =
                LocalDate.of(year, month, 1);

        LocalDate end =
                start.withDayOfMonth(
                        start.lengthOfMonth());

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailAndDateBetweenOrderByDateDesc(
                                email, start, end);

        BigDecimal income =
                sum(transactions, TransactionType.INCOME);

        BigDecimal expenses =
                sum(transactions, TransactionType.EXPENSE);

        long days =
                Math.max(
                        1,
                        transactions.stream()
                                .map(Transaction::getDate)
                                .distinct()
                                .count());

        BigDecimal average =
                expenses.divide(
                        BigDecimal.valueOf(days),
                        2,
                        RoundingMode.HALF_UP);

        return FinancialReport.builder()
                .period(
                        String.format(
                                "%04d-%02d",
                                year,
                                month))
                .income(income)
                .expenses(expenses)
                .savings(
                        income.subtract(expenses))
                .averageExpense(average)
                .categoryBreakdown(
                        analyticsService.categorySpending(
                                email)
                                .stream()
                                .filter(c ->
                                        transactions.stream()
                                                .anyMatch(t ->
                                                        t.getCategory()
                                                                .equalsIgnoreCase(
                                                                        c.getCategory())))
                                .toList())
                .monthlyBreakdown(
                        analyticsService.monthlySpending(
                                email))
                .build();
    }

    private BigDecimal sum(
            List<Transaction> transactions,
            TransactionType type) {

        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO,
                        BigDecimal::add);
    }
}


@RestController
@RequestMapping("/api/reports")
class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/monthly")
    ResponseEntity<FinancialReport> monthly(
            Authentication authentication,
            @RequestParam int year,
            @RequestParam int month) {

        return ResponseEntity.ok(
                reportService.monthlyReport(
                        authentication.getName(),
                        year,
                        month));
    }
}


// ============================================================
// 14. SMART RECOMMENDATION MODULE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Recommendation {

    private String type;
    private String title;
    private String message;
    private String category;
    private BigDecimal amount;
}


@Service
class RecommendationService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BudgetService budgetService;

    public List<Recommendation> getRecommendations(
            String email) {

        List<Recommendation> result =
                new ArrayList<>();

        List<Transaction> transactions =
                transactionRepository
                        .findByUserEmailOrderByDateDescCreatedAtDesc(
                                email);

        BigDecimal expenses =
                transactions.stream()
                        .filter(t ->
                                t.getType() ==
                                        TransactionType.EXPENSE)
                        .map(Transaction::getAmount)
                        .reduce(BigDecimal.ZERO,
                                BigDecimal::add);

        if (expenses.signum() == 0) {

            result.add(
                    Recommendation.builder()
                            .type("INFO")
                            .title("Start tracking")
                            .message(
                                    "Add your expenses to receive personalised spending recommendations.")
                            .build());

            return result;
        }

        Map<String, BigDecimal> categories =
                transactions.stream()
                        .filter(t ->
                                t.getType() ==
                                        TransactionType.EXPENSE)
                        .collect(Collectors.groupingBy(
                                Transaction::getCategory,
                                Collectors.reducing(
                                        BigDecimal.ZERO,
                                        Transaction::getAmount,
                                        BigDecimal::add)));

        categories.entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .ifPresent(entry -> {

                    double percentage =
                            entry.getValue().doubleValue()
                                    / expenses.doubleValue()
                                    * 100;

                    if (percentage >= 30) {

                        result.add(
                                Recommendation.builder()
                                        .type("SPENDING")
                                        .title(
                                                "High spending category")
                                        .category(
                                                entry.getKey())
                                        .amount(
                                                entry.getValue())
                                        .message(
                                                String.format(
                                                        "Around %.1f%% of your recorded expenses are in %s. Consider setting a category limit.",
                                                        percentage,
                                                        entry.getKey()))
                                        .build());
                    }
                });

        BudgetStatus budget =
                budgetService.current(email);

        if ("WARNING".equals(budget.getStatus())) {

            result.add(
                    Recommendation.builder()
                            .type("BUDGET")
                            .title("Budget warning")
                            .amount(
                                    budget.getRemaining())
                            .message(
                                    "You have used more than 80% of your monthly budget. Consider reducing non-essential spending.")
                            .build());

        } else if ("EXCEEDED".equals(
                budget.getStatus())) {

            result.add(
                    Recommendation.builder()
                            .type("BUDGET")
                            .title("Budget exceeded")
                            .amount(
                                    budget.getSpent()
                                            .subtract(
                                                    budget.getBudget()))
                            .message(
                                    "Your monthly expenses have exceeded the current budget.")
                            .build());
        }

        if (result.isEmpty()) {

            result.add(
                    Recommendation.builder()
                            .type("POSITIVE")
                            .title("Spending looks controlled")
                            .message(
                                    "Your current spending pattern does not show a major warning.")
                            .build());
        }

        return result;
    }
}


@RestController
@RequestMapping("/api/recommendations")
class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @GetMapping
    ResponseEntity<List<Recommendation>> recommendations(
            Authentication authentication) {

        return ResponseEntity.ok(
                recommendationService.getRecommendations(
                        authentication.getName()));
    }
}


// ============================================================
// 15. ADMIN MODULE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AdminDashboardResponse {

    private String adminName;
    private long totalUsers;
    private long totalAdmins;
    private long regularUsers;
    private String status;
    private String serverTime;
    private List<UserDto> recentUsers;
}


@Service
class AdminService {

    @Autowired
    private UserRepository userRepository;

    public AdminDashboardResponse dashboard(
            String adminEmail) {

        User admin =
                userRepository.findByEmail(adminEmail)
                        .orElseThrow(() ->
                                new UsernameNotFoundException(
                                        "Admin not found"));

        long total =
                userRepository.count();

        long admins =
                userRepository.countByRole(
                        Role.ADMIN);

        long users =
                userRepository.countByRole(
                        Role.USER);

        List<UserDto> recent =
                userRepository
                        .findTop10ByOrderByCreatedAtDesc()
                        .stream()
                        .map(this::toDto)
                        .toList();

        return AdminDashboardResponse.builder()
                .adminName(admin.getFullName())
                .totalUsers(total)
                .totalAdmins(admins)
                .regularUsers(users)
                .status("Online")
                .serverTime(
                        LocalDateTime.now()
                                .format(
                                        DateTimeFormatter.ofPattern(
                                                "yyyy-MM-dd HH:mm:ss")))
                .recentUsers(recent)
                .build();
    }

    public List<UserDto> getAllUsers() {

        return userRepository.findAll(
                        Sort.by(
                                Sort.Direction.DESC,
                                "createdAt"))
                .stream()
                .map(this::toDto)
                .toList();
    }

    private UserDto toDto(User user) {

        return UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}


@RestController
@RequestMapping("/api/admin")
class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/dashboard")
    ResponseEntity<AdminDashboardResponse> dashboard(
            Authentication authentication) {

        return ResponseEntity.ok(
                adminService.dashboard(
                        authentication.getName()));
    }

    @GetMapping("/users")
    ResponseEntity<List<UserDto>> users() {

        return ResponseEntity.ok(
                adminService.getAllUsers());
    }
}


// ============================================================
// 16. REPOSITORIES
// ============================================================

@Repository
interface UserRepository
        extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    long countByRole(Role role);

    List<User> findTop10ByOrderByCreatedAtDesc();
}


// ============================================================
// 17. COMMON API RESPONSE
// ============================================================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ApiResponse {

    private boolean success;
    private String message;
    private Object data;

    public static ApiResponse success(
            String message) {

        return ApiResponse.builder()
                .success(true)
                .message(message)
                .build();
    }

    public static ApiResponse success(
            String message,
            Object data) {

        return ApiResponse.builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static ApiResponse error(
            String message) {

        return ApiResponse.builder()
                .success(false)
                .message(message)
                .build();
    }
}


// ============================================================
// 18. EXCEPTION HANDLING
// ============================================================

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(
            org.springframework.web.bind.MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse> validation(
            org.springframework.web.bind.MethodArgumentNotValidException e) {

        String message =
                e.getBindingResult()
                        .getFieldErrors()
                        .stream()
                        .map(error ->
                                error.getField()
                                        + ": "
                                        + error.getDefaultMessage())
                        .collect(Collectors.joining(", "));

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResponse> illegalArgument(
            IllegalArgumentException e) {

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(
                        e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<ApiResponse> illegalState(
            IllegalStateException e) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(
                        e.getMessage()));
    }

    @ExceptionHandler(
            org.springframework.security.authentication.BadCredentialsException.class)
    ResponseEntity<ApiResponse> badCredentials() {

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(
                        "Invalid email or password"));
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    ResponseEntity<ApiResponse> userNotFound(
            UsernameNotFoundException e) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(
                        e.getMessage()));
    }

    @ExceptionHandler(
            org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<ApiResponse> accessDenied() {

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(
                        "Access denied"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse> general(
            Exception e) {

        e.printStackTrace();

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(
                        "Something went wrong. Please try again."));
    }
}

// ============================================================
// TRANSACTION REMINDER SCHEDULER
// ============================================================

@Component
class TransactionReminderScheduler {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;

    @Scheduled(fixedRate = 60000)
    public void checkTransactionReminders() {

        LocalDateTime now = LocalDateTime.now();

        List<Transaction> transactions =
                transactionRepository
                        .findByReminderEnabledTrueAndReminderSentFalseAndReminderAtLessThanEqual(
                                now);

        for (Transaction transaction : transactions) {

            String email = transaction.getUserEmail();

            String title = "🔔 Transaction Reminder";

            String message =
                    "Reminder: You scheduled a transaction for "
                            + transaction.getCategory()
                            + " of "
                            + formatMoney(transaction.getAmount())
                            + ".";

            String alertKey =
                    "REMINDER:" + transaction.getId();

            notificationService.create(
                    email,
                    title,
                    message,
                    "REMINDER",
                    alertKey
            );

            transaction.setReminderSent(true);
            transactionRepository.save(transaction);
        }
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "₹0.00";
        }

        return "₹" +
                amount.setScale(2, RoundingMode.HALF_UP)
                        .toPlainString();
    }
}

// ============================================================
// RECURRING TRANSACTION SCHEDULER
// ============================================================

@Component
class RecurringTransactionScheduler {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;

    @Scheduled(fixedRate = 60000)
    public void processRecurringTransactions() {

        LocalDate today = LocalDate.now();

        List<Transaction> dueTransactions =
                transactionRepository
                        .findByRecurringActiveTrueAndNextRecurrenceDateLessThanEqual(
                                today);

        for (Transaction recurring : dueTransactions) {

            LocalDate nextDate = recurring.getNextRecurrenceDate();

            if (nextDate == null) {
                recurring.setRecurringActive(false);
                transactionRepository.save(recurring);
                continue;
            }

            // Stop recurrence if its end date has passed.
            if (recurring.getRecurrenceEndDate() != null
                    && nextDate.isAfter(recurring.getRecurrenceEndDate())) {

                recurring.setRecurringActive(false);
                recurring.setNextRecurrenceDate(null);
                transactionRepository.save(recurring);
                continue;
            }

            // Create the transaction for the scheduled date.
            Transaction generated = Transaction.builder()
                    .userEmail(recurring.getUserEmail())
                    .type(recurring.getType())
                    .amount(recurring.getAmount())
                    .category(recurring.getCategory())
                    .description(recurring.getDescription())
                    .paymentMethod(recurring.getPaymentMethod())
                    .merchant(recurring.getMerchant())
                    .date(nextDate)

                    // Generated transactions are not recurrence masters.
                    .recurrenceFrequency(RecurrenceFrequency.NONE)
                    .recurringActive(false)
                    .recurrenceEndDate(null)
                    .nextRecurrenceDate(null)

                    // Do not copy reminders to every generated transaction.
                    .reminderEnabled(false)
                    .reminderAt(null)
                    .reminderSent(false)
                    .build();

            transactionRepository.save(generated);

            if (generated.getType() == TransactionType.EXPENSE) {
                notificationService.checkBudget(
                        generated.getUserEmail());
            }

            // Calculate the following occurrence.
            LocalDate followingDate =
                    calculateNextDate(
                            nextDate,
                            recurring.getRecurrenceFrequency());

            if (followingDate == null) {
                recurring.setRecurringActive(false);
                recurring.setNextRecurrenceDate(null);
            } else if (recurring.getRecurrenceEndDate() != null
                    && followingDate.isAfter(
                            recurring.getRecurrenceEndDate())) {

                recurring.setRecurringActive(false);
                recurring.setNextRecurrenceDate(null);
            } else {
                recurring.setNextRecurrenceDate(followingDate);
            }

            transactionRepository.save(recurring);
        }
    }

    private LocalDate calculateNextDate(
            LocalDate date,
            RecurrenceFrequency frequency) {

        if (date == null || frequency == null) {
            return null;
        }

        return switch (frequency) {
            case DAILY -> date.plusDays(1);
            case WEEKLY -> date.plusWeeks(1);
            case MONTHLY -> date.plusMonths(1);
            case YEARLY -> date.plusYears(1);
            case NONE -> null;
        };
    }
}