var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mysql = require('mysql2');
require('dotenv').config();
const sequelize = require('./db');
const Url = require('./models/Url');
const { nanoid } = require('nanoid');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

sequelize.sync({ alter: true })
  .then(() => console.log("Database synced"))
  .catch(err => console.error("Database sync error:", err));


// POST /shorten
app.post('/shorten', async (req, res) => {
  console.log("POST /shorten hit");
  console.log("Request body:", req.body);

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    console.log("Validation failed");
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  try {
    let shortCode;
    let existing;
    do {
      shortCode = nanoid(6);
      existing = await Url.findOne({ where: { shortCode } });
    } while (existing);

    console.log("Shortcode generated:", shortCode);

    const newUrl = await Url.create({ url, shortCode });

    console.log("New URL entry created:", newUrl);

    res.status(201).json(newUrl);
  } catch (error) {
    console.error("Error in /shorten route:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const urlEntry = await Url.findOne({ where: { shortCode },
      attributes: { exclude: ['count'] } });

    if (!urlEntry) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    res.status(200).json(urlEntry);
  } catch (error) {
    console.error("Error in GET /shorten/:shortCode:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.put('/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  const { url } = req.body;

  // Validate input
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required!' });
  }

  try {
    // Find existing short URL entry
    const urlEntry = await Url.findOne({ where: { shortCode } });

    if (!urlEntry) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    // Update the URL
    urlEntry.url = url;
    await urlEntry.save();

    res.status(200).json(await Url.findOne({ where: { shortCode }, attributes: { exclude: ['count'] } }));
  } catch (error) {
    console.error("Error in PUT /shorten/:shortCode:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.delete('/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const deletedCount = await Url.destroy({ where: { shortCode } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    // 204 No Content means success, no body returned
    res.status(204).send();
  } catch (error) {
    console.error("Error in DELETE /shorten/:shortCode:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/shorten/:shortCode/stats', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const urlEntry = await Url.findOne({ where: { shortCode } });

    if (!urlEntry) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    res.status(200).json({
      id: urlEntry.id,
      url: urlEntry.url,
      shortCode: urlEntry.shortCode,
      createdAt: urlEntry.createdAt,
      updatedAt: urlEntry.updatedAt,
      accessCount: urlEntry.count || 0
    });
  } catch (error) {
    console.error("Error in GET /shorten/:shortCode/stats:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(`Error: ${err.message}`);
});

module.exports = app;

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});