// diagnoses-fixed.js - SIMPAN SEBAGAI FILE BARU

class FixedDiagnosisService {
    static async loadDiagnosesTable() {
        try {
            console.log('🔄 Loading diagnoses table...');
            
            // Ambil data dari API
            const response = await fetch('http://localhost:8000/api/diagnoses');
            const data = await response.json();
            
            console.log('📊 API Response:', data);
            
            const tbody = document.querySelector('#diagnosesTable tbody');
            if (!tbody) {
                console.error('❌ Table body not found');
                return;
            }
            
            // Process data
            let diagnoses = [];
            if (data.data && Array.isArray(data.data)) {
                diagnoses = data.data;
            } else if (Array.isArray(data)) {
                diagnoses = data;
            }
            
            if (!diagnoses.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-file-medical"></i>
                            Tidak ada data diagnosa
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Render table
            tbody.innerHTML = diagnoses.map(diagnosis => `
                <tr>
                    <td>${diagnosis.id}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: #e3f2fd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; color: #1565c0;">
                                U
                            </div>
                            <div>
                                <div style="font-weight: 500;">User ${diagnosis.user_id}</div>
                                <div style="font-size: 0.8rem; color: #666;">ID: ${diagnosis.user_id}</div>
                            </div>
                        </div>
                    </td>
                    <td>${diagnosis.user?.usia || 'Tidak Diketahui'} tahun</td>
                    <td>${diagnosis.gejala_count || 0} gejala</td>
                    <td>
                        <span class="badge ${(diagnosis.tingkat_risiko || '').toLowerCase()}">
                            ${diagnosis.tingkat_risiko || 'Tidak Diketahui'}
                        </span>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: #4caf50;">
                            ${((diagnosis.skor_akhir || 0) * 100).toFixed(1)}%
                        </div>
                    </td>
                    <td>${new Date(diagnosis.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                        <button onclick="alert('Detail diagnosis ID: ${diagnosis.id}')" class="btn-view">View</button>
                    </td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('❌ Error:', error);
            const tbody = document.querySelector('#diagnosesTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-exclamation-triangle"></i>
                            Gagal memuat data: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }
}

// Jalankan ketika halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    FixedDiagnosisService.loadDiagnosesTable();
});