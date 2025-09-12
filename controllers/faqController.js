const { 
  getAllFAQs, 
  getFAQById, 
  addFAQ, 
  updateFAQ, 
  deleteFAQ, 
  getCategories 
} = require('../utils/faqUtils');
const { validationResult } = require('express-validator');

// Get all FAQs (for users)
const getFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;
    let faqs = await getAllFAQs();

    // Filter by category if provided
    if (category && category !== 'All') {
      faqs = faqs.filter(faq => faq.category === category);
    }

    // Filter by search term if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      faqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchTerm) ||
        faq.answer.toLowerCase().includes(searchTerm)
      );
    }

    res.status(200).json({
      success: true,
      message: 'FAQs retrieved successfully',
      data: {
        faqs,
        total: faqs.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get FAQ categories
const getFAQCategories = async (req, res) => {
  try {
    const categories = await getCategories();

    res.status(200).json({
      success: true,
      message: 'FAQ categories retrieved successfully',
      data: {
        categories
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get FAQ by ID
const getFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await getFAQById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'FAQ retrieved successfully',
      data: faq,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create new FAQ (admin only)
const createFAQ = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { question, answer, category } = req.body;

    // Validate required fields
    if (!question || !answer || !category) {
      return res.status(400).json({
        success: false,
        message: 'Question, answer, and category are required',
        timestamp: new Date().toISOString()
      });
    }

    const newFAQ = await addFAQ({ question, answer, category });

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: newFAQ,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update FAQ (admin only)
const editFAQ = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { id } = req.params;
    const { question, answer, category } = req.body;

    const updatedFAQ = await updateFAQ(id, { question, answer, category });

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: updatedFAQ,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete FAQ (admin only)
const removeFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFAQ = await deleteFAQ(id);

    if (!deletedFAQ) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
      data: deletedFAQ,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getFAQs,
  getFAQCategories,
  getFAQ,
  createFAQ,
  editFAQ,
  removeFAQ
};
