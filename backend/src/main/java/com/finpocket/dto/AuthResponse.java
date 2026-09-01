package com.finpocket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private boolean success;
    private String message;
    private String token;
    private String userId;
    private String fullName;
    private String email;
    private String role;
}
