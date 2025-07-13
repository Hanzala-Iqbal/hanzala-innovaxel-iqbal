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



var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();


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
  const { url } = req.body;

  // Basic Validation
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  try {
    // Generate unique shortcode
    let shortCode;
    let existing;
    do {
      shortCode = nanoid(6);
      existing = await Url.findOne({ where: { shortCode } });
    } while (existing);

    // Create new URL entry
    const newUrl = await Url.create({
      url,
      shortCode
    });

    res.status(201).json(newUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
