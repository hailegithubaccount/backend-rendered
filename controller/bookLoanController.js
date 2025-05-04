const BookLoan = require('../model/BookLoan');

// Staff creates loan
exports.createLoan = async (req, res) => {
  try {
    const loan = await BookLoan.create({
      ...req.body,
      staffId: req.user.id
    });
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ 
      status: 'fail',
      message: error.message 
    });
  }
};

// Student views loans
exports.getMyLoans = async (req, res) => {
  try {
    const loans = await BookLoan.find({ 
      studentEmail: req.user.email 
    });
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Staff returns book
exports.returnBook = async (req, res) => {
  try {
    const loan = await BookLoan.findByIdAndUpdate(
      req.params.loanId,
      {
        status: 'returned',
        returnDate: new Date()
      },
      { new: true }
    );
    res.status(200).json(loan);
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};