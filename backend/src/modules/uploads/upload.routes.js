const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const multer = require('multer');
const { Router } = require('express');

const { authenticate } = require('../../middlewares/auth');
const AppError = require('../../utils/AppError');

const uploadDir = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = Router();

router.use(authenticate);

function safeExtension(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension) return extension;

  const mimeExtension = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };

  return mimeExtension[file.mimetype] || '';
}

function localUploadResponse(file) {
  const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file)}`;
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, file.buffer);

  return {
    fileUrl: `/uploads/${filename}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

async function supabaseUploadResponse(file) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'photos';

  if (!supabaseUrl || !supabaseKey || !file.mimetype?.startsWith('image/')) {
    return localUploadResponse(file);
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file)}`;
  const objectPath = `uploads/${filename}`;
  const normalizedUrl = supabaseUrl.replace(/\/$/, '');
  const uploadUrl = `${normalizedUrl}/storage/v1/object/${bucket}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': file.mimetype,
      'x-upsert': 'false',
    },
    body: file.buffer,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new AppError(`Falha ao enviar arquivo para o Supabase: ${message}`, 502);
  }

  return {
    fileUrl: `${normalizedUrl}/storage/v1/object/public/${bucket}/${objectPath}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

router.post('/', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Arquivo nao informado', 400));
  }

  try {
    const uploaded = await supabaseUploadResponse(req.file);
    return res.status(201).json(uploaded);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
