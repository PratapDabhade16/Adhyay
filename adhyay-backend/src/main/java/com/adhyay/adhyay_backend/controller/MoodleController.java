
package com.adhyay.adhyay_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/moodle")
public class MoodleController {

    @Value("${moodle.base-url}")
    private String moodleBaseUrl;

    @Value("${moodle.token}")
    private String moodleToken;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/courses")
    public ResponseEntity<String> getCourses() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("wstoken", moodleToken);
        form.add("wsfunction", "core_course_get_courses");
        form.add("moodlewsrestformat", "json");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request =
                new HttpEntity<>(form, headers);

        String result = restTemplate.postForObject(
                moodleBaseUrl + "/webservice/rest/server.php",
                request,
                String.class
        );

        return ResponseEntity.ok(result);
    }
}
