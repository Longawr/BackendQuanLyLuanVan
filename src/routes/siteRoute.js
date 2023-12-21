const express = require('express');

const router = express.Router();

// http://localhost:<port>/
router.get('/', (req, res, next) => res.send('Welcome to the QuanLyDoAn API'));

module.exports = router;
