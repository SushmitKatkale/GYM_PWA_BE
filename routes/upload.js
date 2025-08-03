const express = require('express');
const router = express.Router();
const { uploadGymImageGeneral } = require('../controllers/gymImageController');
const { authenticate } = require('../middleware/auth');
const upload = require('../config/multer');

/**
 * @swagger
 * /api/upload/gym-image:
 *   post:
 *     tags: [Upload]
 *     summary: Upload gym image without gym association
 *     description: Upload an image that will be stored with gym_id = -1 (not associated with any specific gym).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpeg, jpg, png, gif, webp)
 *               title:
 *                 type: string
 *                 description: Image title
 *               createdBy:
 *                 type: string
 *                 description: User who is uploading the image
 *             required:
 *               - image
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input or file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/gym-image', authenticate, upload.single('image'), uploadGymImageGeneral);

module.exports = router;
