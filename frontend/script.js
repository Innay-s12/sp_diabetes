// frontend/script.js - API Services

const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
    static async request(endpoint, options = {}) {
        const token = sessionStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                sessionStorage.clear();
                window.location.href = 'login.html';
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error(`API Request error for ${endpoint}:`, error);
            throw error;
        }
    }
}

class UserService {
    static getAll() {
        return ApiService.request('/users');
    }
    
    static getById(id) {
        return ApiService.request(`/users/${id}`);
    }
    
    static create(userData) {
        return ApiService.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    static update(id, userData) {
        return ApiService.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    static delete(id) {
        return ApiService.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }
}

class SymptomService {
    static getAll() {
        return ApiService.request('/symptoms');
    }
    
    static getById(id) {
        return ApiService.request(`/symptoms/${id}`);
    }
    
    static create(symptomData) {
        return ApiService.request('/symptoms', {
            method: 'POST',
            body: JSON.stringify(symptomData)
        });
    }
    
    static update(id, symptomData) {
        return ApiService.request(`/symptoms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(symptomData)
        });
    }
    
    static delete(id) {
        return ApiService.request(`/symptoms/${id}`, {
            method: 'DELETE'
        });
    }
}

class DiagnosisService {
    static getAll() {
        return ApiService.request('/diagnoses');
    }
    
    static getById(id) {
        return ApiService.request(`/diagnoses/${id}`);
    }
    
    static create(diagnosisData) {
        return ApiService.request('/diagnoses', {
            method: 'POST',
            body: JSON.stringify(diagnosisData)
        });
    }
    
    static update(id, diagnosisData) {
        return ApiService.request(`/diagnoses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(diagnosisData)
        });
    }
    
    static delete(id) {
        return ApiService.request(`/diagnoses/${id}`, {
            method: 'DELETE'
        });
    }
}

class RecommendationService {
    static getAll() {
        return ApiService.request('/recommendations');
    }
    
    static getById(id) {
        return ApiService.request(`/recommendations/${id}`);
    }
    
    static create(recommendationData) {
        return ApiService.request('/recommendations', {
            method: 'POST',
            body: JSON.stringify(recommendationData)
        });
    }
    
    static update(id, recommendationData) {
        return ApiService.request(`/recommendations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(recommendationData)
        });
    }
    
    static delete(id) {
        return ApiService.request(`/recommendations/${id}`, {
            method: 'DELETE'
        });
    }
}

// Export services untuk digunakan di halaman lain
window.UserService = UserService;
window.SymptomService = SymptomService;
window.DiagnosisService = DiagnosisService;
window.RecommendationService = RecommendationService;
window.ApiService = ApiService;