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

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'photos',
  };
}

async function supabaseUploadResponse(file) {
  const { url: supabaseUrl, key: supabaseKey, bucket } = supabaseConfig();

  if (!supabaseUrl || !supabaseKey || !file.mimetype?.startsWith('image/')) {
    return localUploadResponse(file);
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file)}`;
  const objectPath = `uploads/${filename}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

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
    fileUrl: `/uploads/supabase/${objectPath}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

async function streamSupabaseObject(req, res, next) {
  const objectPath = req.params[0];
  const { url: supabaseUrl, key: supabaseKey, bucket } = supabaseConfig();

  if (!objectPath || !supabaseUrl || !supabaseKey) {
    return next(new AppError('Arquivo nao encontrado', 404));
  }

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      return next(new AppError('Arquivo nao encontrado', 404));
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
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

router.streamSupabaseObject = streamSupabaseObject;

module.exports = router;
