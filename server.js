require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const { checkAuthStatus, addUnreadNotificationCountToLocals } = require('./middlewares/authMiddleware');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const generalApiRoutes = require('./routes/api');
const userRoutes = require('./routes/user');
const geminiApiRouter = require('./routes/gemini');
const promoDetailRoutes = require('./routes/promoDetail');
const endpointDocsRouter = require('./routes/endpointDocs');
const codeRouter = require('./routes/code');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_strong_and_long_secret_key_for_session_that_is_hard_to_guess_and_unique',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
        return res.sendStatus(204);
    }
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(checkAuthStatus);
app.use(addUnreadNotificationCountToLocals);

app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});
app.get('/premium', (req, res) => {
    res.render('premium', { title: 'Premium Features'});
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api', generalApiRoutes);
app.use('/api/ai', geminiApiRouter);
app.use('/promos', promoDetailRoutes);
app.use('/endpoints', endpointDocsRouter);
app.use('/code', codeRouter);

if (userRoutes && typeof userRoutes === 'function') {
    app.use('/user', userRoutes);
}

app.use((req, res, next) => {
    console.warn(`404 Not Found for: ${req.method} ${req.originalUrl}`);
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    console.error("Global Error Handler:", error.message, "Status:", error.status || 500);
    const status = error.status || 500;
    const message = (status === 500 && process.env.NODE_ENV === 'production') ? 'An internal server error occurred.' : error.message;

    if (res.headersSent) {
        return next(error);
    }
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(status).json({ success: false, error: { message: message } });
    }
    try {
        res.status(status).render('error', {
            title: `${status} - Error`,
            message: message,
            status: status,
        });
    } catch (renderError) {
        console.error('Error rendering error page itself:', renderError);
        res.status(500).send('An internal server error occurred, and the error page could not be rendered.');
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});