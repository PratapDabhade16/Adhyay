
package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {
        "http://127.0.0.1:5500",
        "http://localhost:5500"
})
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record UserSummary(
            String id, String name, String email, String role) {}

    @GetMapping("/users")
    public List<UserSummary> getUsers(@RequestParam String role) {
        String selectedRole = role.toUpperCase(Locale.ROOT);

        if (!selectedRole.equals("STUDENT")
                && !selectedRole.equals("FACULTY")) {
            throw new IllegalArgumentException("Invalid role");
        }

        return userRepository.findAll().stream()
                .filter(user -> user.getRole() != null
                        && user.getRole().equalsIgnoreCase(selectedRole))
                .map(user -> new UserSummary(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole()))
                .toList();
    }
}
