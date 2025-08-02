const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * @swagger
 * /api/owners:
 *   get:
 *     tags: [Owners]
 *     summary: Get all gym owners
 *     description: Retrieve a list of all gym owners
 *     responses:
 *       200:
 *         description: List of gym owners retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error
 */
async function getOwners(req, res) {
  try {
    const owners = await User.findAll({ where: { type: '2' } }); // Type '2' for owners
    res.json({ success: true, data: owners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @swagger
 * /api/owners/search:
 *   get:
 *     tags: [Owners]
 *     summary: Search gym owners
 *     description: Search gym owners by name
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for owner name
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error
 */
async function searchOwners(req, res) {
  try {
    const { query } = req.query;
    const owners = await User.findAll({
      where: {
        type: '2',
        [Op.or]: [{ firstName: { [Op.like]: `%${query}%` } }, { lastName: { [Op.like]: `%${query}%` } }]
      }
    });
    res.json({ success: true, data: owners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @swagger
 * /api/owners:
 *   post:
 *     tags: [Owners]
 *     summary: Create a new gym owner
 *     description: Add a new gym owner to the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - username
 *               - phoneNumber
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Owner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error
 */
async function createOwner(req, res) {
  try {
    const { firstName, lastName, email, password, username, phoneNumber } = req.body;
    const owner = await User.create({
      firstName,
      lastName,
      email,
      password,
      username,
      phoneNumber,
      type: '2'
    });
    res.json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @swagger
 * /api/owners/{id}:
 *   put:
 *     tags: [Owners]
 *     summary: Update a gym owner
 *     description: Update gym owner information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Owner updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Owner updated successfully"
 *       500:
 *         description: Internal server error
 */
async function updateOwner(req, res) {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, username, phoneNumber } = req.body;
    await User.update({ firstName, lastName, email, username, phoneNumber }, { where: { id } });
    res.json({ success: true, message: 'Owner updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @swagger
 * /api/owners/{id}:
 *   delete:
 *     tags: [Owners]
 *     summary: Delete a gym owner
 *     description: Remove a gym owner from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner ID
 *     responses:
 *       200:
 *         description: Owner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Owner deleted successfully"
 *       500:
 *         description: Internal server error
 */
async function deleteOwner(req, res) {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    res.json({ success: true, message: 'Owner deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getOwners, createOwner, updateOwner, deleteOwner, searchOwners };
