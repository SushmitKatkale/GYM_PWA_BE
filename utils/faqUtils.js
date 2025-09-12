const fs = require('fs').promises;
const path = require('path');

const FAQ_FILE_PATH = path.join(__dirname, '../data/faqs.json');

// Helper function to ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(FAQ_FILE_PATH);
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Read FAQs from file
const readFAQs = async () => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(FAQ_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    throw error;
  }
};

// Write FAQs to file
const writeFAQs = async (faqs) => {
  try {
    await ensureDataDirectory();
    await fs.writeFile(FAQ_FILE_PATH, JSON.stringify(faqs, null, 2), 'utf8');
  } catch (error) {
    throw error;
  }
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Get all FAQs
const getAllFAQs = async () => {
  return await readFAQs();
};

// Get FAQ by ID
const getFAQById = async (id) => {
  const faqs = await readFAQs();
  return faqs.find(faq => faq.id === id);
};

// Add new FAQ
const addFAQ = async (faqData) => {
  const faqs = await readFAQs();
  const newFAQ = {
    id: generateId(),
    question: faqData.question,
    answer: faqData.answer,
    category: faqData.category
  };
  faqs.push(newFAQ);
  await writeFAQs(faqs);
  return newFAQ;
};

// Update FAQ
const updateFAQ = async (id, faqData) => {
  const faqs = await readFAQs();
  const index = faqs.findIndex(faq => faq.id === id);
  
  if (index === -1) {
    return null;
  }

  faqs[index] = {
    ...faqs[index],
    question: faqData.question || faqs[index].question,
    answer: faqData.answer || faqs[index].answer,
    category: faqData.category || faqs[index].category
  };

  await writeFAQs(faqs);
  return faqs[index];
};

// Delete FAQ
const deleteFAQ = async (id) => {
  const faqs = await readFAQs();
  const index = faqs.findIndex(faq => faq.id === id);
  
  if (index === -1) {
    return false;
  }

  const deletedFAQ = faqs[index];
  faqs.splice(index, 1);
  await writeFAQs(faqs);
  return deletedFAQ;
};

// Get all categories
const getCategories = async () => {
  const faqs = await readFAQs();
  const categories = [...new Set(faqs.map(faq => faq.category))];
  return ['All', ...categories.sort()];
};

module.exports = {
  getAllFAQs,
  getFAQById,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  getCategories
};
