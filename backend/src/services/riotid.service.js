const axios = require('axios');

class RiotIdService {
  constructor() {
    // Using Henrik's Unofficial Valorant API
    this.apiUrl = 'https://api.henrikdev.xyz/valorant/v1';
    this.apiKey = process.env.HENRIKDEV_API_KEY;
  }

  // Validate and get account info by Riot ID and Tagline
  async validateRiotId(gameName, tagLine) {
    try {
      // Remove # if user included it
      const cleanTagLine = tagLine.replace('#', '');
      const cleanGameName = gameName.trim();

      console.log(`Validating Riot ID: ${cleanGameName}#${cleanTagLine}`);

      // Prepare headers with API key
      const headers = {
        'Accept': 'application/json',
      };

      // Add authorization if API key is available
      if (this.apiKey) {
        headers['Authorization'] = this.apiKey;
        console.log('Using Henrik API key for authentication');
      } else {
        console.warn('WARNING: HENRIKDEV_API_KEY not set - API calls may fail!');
      }

      // Call Henrik API - Account endpoint
      const response = await axios.get(
        `${this.apiUrl}/account/${encodeURIComponent(cleanGameName)}/${encodeURIComponent(cleanTagLine)}`,
        {
          headers: headers,
          timeout: 10000, // 10 seconds
        }
      );

      console.log('Henrik API Response:', response.data);

      if (response.data.status === 200 && response.data.data) {
        const accountData = response.data.data;

        return {
          success: true,
          data: {
            valid: true,
            gameName: accountData.name,
            tagLine: accountData.tag,
            puuid: accountData.puuid,
            region: accountData.region,
            accountLevel: accountData.account_level,
            card: accountData.card, // Player card info
          },
        };
      } else {
        return {
          success: false,
          message: 'Riot ID not found',
          valid: false,
        };
      }
    } catch (error) {
      console.error('Error validating Riot ID:', error.response?.data || error.message);

      // Handle specific error codes
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'API Key invalid atau tidak tersedia. Periksa HENRIKDEV_API_KEY di .env',
          valid: false,
          needsApiKey: true,
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Riot ID tidak ditemukan. Periksa kembali Riot ID dan Tagline kamu.',
          valid: false,
        };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          message: 'Terlalu banyak request. Coba lagi dalam beberapa saat.',
          valid: false,
        };
      } else {
        return {
          success: false,
          message: 'Gagal memvalidasi Riot ID. Silakan coba lagi.',
          valid: false,
        };
      }
    }
  }

  // Alternative: Simple format validation (offline, no API call)
  validateFormat(gameName, tagLine) {
    const cleanTagLine = tagLine.replace('#', '').trim();
    const cleanGameName = gameName.trim();

    // Riot ID rules:
    // Game Name: 3-16 characters
    // Tagline: 3-5 alphanumeric characters

    const errors = [];

    if (!cleanGameName || cleanGameName.length < 3 || cleanGameName.length > 16) {
      errors.push('Riot ID harus 3-16 karakter');
    }

    if (!cleanTagLine || cleanTagLine.length < 3 || cleanTagLine.length > 5) {
      errors.push('Tagline harus 3-5 karakter');
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(cleanGameName)) {
      errors.push('Riot ID hanya boleh huruf, angka, dan spasi');
    }

    if (!/^[a-zA-Z0-9]+$/.test(cleanTagLine)) {
      errors.push('Tagline hanya boleh huruf dan angka');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      formatted: {
        gameName: cleanGameName,
        tagLine: cleanTagLine,
      },
    };
  }

  // Format Riot ID for display
  formatRiotId(gameName, tagLine) {
    const cleanTagLine = tagLine.replace('#', '');
    return `${gameName}#${cleanTagLine}`;
  }
}

module.exports = new RiotIdService();
