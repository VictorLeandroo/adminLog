const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const multer = require('multer');
const { Router } = require('express');

const { authenticate } = require('../../middlewares/auth');
const AppError = require('../../utils/AppError');

const uploadDir = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '');
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    callback(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = Router();

router.use(authenticate);

router.post('/', upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Arquivo nao informado', 400));
  }

  return res.status(201).json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

module.exports = router;
