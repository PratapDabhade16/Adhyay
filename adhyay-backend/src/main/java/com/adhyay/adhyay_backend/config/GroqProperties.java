package com.adhyay.adhyay_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "groq")
public class GroqProperties {

    private String apiKey;
    private String baseUrl = "https://api.groq.com/openai/v1";
    private Models models = new Models();

    public static class Models {
        private String whisper = "whisper-large-v3-turbo";
        private String chat = "llama-3.3-70b-versatile";
        private String queryExpansion = "llama-3.1-8b-instant";

        public String getWhisper() {
            return whisper;
        }

        public void setWhisper(String whisper) {
            this.whisper = whisper;
        }

        public String getChat() {
            return chat;
        }

        public void setChat(String chat) {
            this.chat = chat;
        }

        public String getQueryExpansion() {
            return queryExpansion;
        }

        public void setQueryExpansion(String queryExpansion) {
            this.queryExpansion = queryExpansion;
        }
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Models getModels() {
        return models;
    }

    public void setModels(Models models) {
        this.models = models;
    }
}

