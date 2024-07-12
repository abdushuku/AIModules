const axios = require('axios');
const { mohiraiStt } = require('../server.js'); // Assuming the function is exported from server.js

// Mocking the axios post method for testing
jest.mock('axios');

describe('mohiraiStt function', () => {
    test('should make a successful API call and return text data', async () => {
        const mockResponse = { data: { text: 'Sample text' } };
        axios.post.mockResolvedValue(mockResponse);

        const audio = 'Sample audio';
        const result = await mohiraiStt(audio);

        expect(result).toEqual('Sample text');
    });

    test('should handle error in API call and log the error', async () => {
        const errorMessage = 'Sample error message';
        axios.post.mockRejectedValue({ message: errorMessage });

        const audio = 'Sample audio';

        await expect(mohiraiStt(audio)).rejects.toThrowError(errorMessage);
    });
});
