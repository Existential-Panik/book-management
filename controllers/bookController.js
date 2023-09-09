const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");

const asyncHandler = require("express-async-handler");
const { body, validationResult} = require("express-validator");

const validateBookInput = [
  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),
];

exports.index = async (req, res, next) => {
  try {
    const [
      numBooks,
      numBookInstances,
      numAvailableBookInstances,
      numAuthors,
      numGenres,
    ] = await Promise.all([
      Book.countDocuments({}).exec(),
      BookInstance.countDocuments({}).exec(),
      BookInstance.countDocuments({ status: "Available" }).exec(),
      Author.countDocuments({}).exec(),
      Genre.countDocuments({}).exec(),
    ]);
    res.render("index", {
      title: "Local Library Home",
      book_count: numBooks,
      book_instance_count: numBookInstances,
      book_instance_available_count: numAvailableBookInstances,
      author_count: numAuthors,
      genre_count: numGenres,
    });
  } catch (error) {
    res.render('error', { error: error });
  }
  // Get details of books, book instances, authors ad genre counts (in parallel)
}

// Display list of all books.
exports.book_list = asyncHandler(async (req, res, next) => {
  try {
    const allBooks = await Book.find({}, "title author")
      .sort({ title: 1 })
      .populate("author")
      .exec();

    res.render("book_list", { title: "Book List", book_list: allBooks });
  } catch (error) {
    res.render("error", { error: error })
  }

});

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
  Book.findById(req.params.id).populate("author").populate("genre").exec(),
  BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book == null){
    const err = new Error("Book not found.");
    err.status = 404;
    return next(err);
  }

  res.render("book_details", {
    title: book.title,
    book: book,
    book_instances: bookInstances,
  });

});

// Display book create form on GET.
exports.book_create_get = async (req, res, next) => {
  
  const [ authorList, genreList ] = await Promise.all ([
    Author.find().exec(),
    Genre.find().exec(),
  
  ]);

  res.render("book_form", {
    title: "Create Books",
    authors: authorList,
    genres: genreList,
  });
};

// Handle book create on POST.
exports.book_create_post = [
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },
  validateBookInput,

  asyncHandler (async (req, res, next) => {
      const errors = validationResult(req);

      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre,
      });

      if (!errors.isEmpty) {

        const [authorList, genreList] = await Promise.all ([
          Author.find().exec(),
          Genre.find().exec(),
        ]);

        for(const genre in genreList) {
          if(book.genre.indexOf(genre._id) > -1) {
            genre.checked = "true";
          }
        }

        res.render("book_form", {
          title: "Create Book",
          authors: authorList,
          genres: genreList,
          book: book,
          errors: errors.array(),
        })
      }

      else {
        await book.save();

        res.redirect(book.url);
      }

  }),
];

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [ book, bookInstanceInBook] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({book: req.params.id}).exec(),
  ]);

  if( book === null){
    res.redirect("/catalog/books");
  }
  res.render("book_delete", {
    title: "Delete Book",
    book: book,
    bookinstance_book: bookInstanceInBook,
  })
});

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, next) => {

  const [ book, bookInstanceInBook] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({book: req.params.id}).exec(),
  ]);

  if(bookInstanceInBook > 0) {
    res.render("book_delete", {
      title: "Delete Book",
      book: book,
      bookinstance_book: bookInstanceInBook,
    });
    return;
  }
  else{
    await Book.findByIdAndRemove(req.body.bookid);
    res.redirect("/catalog/books");
  }
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    Author.find().exec(),
    Genre.find().exec(),
  ])

  if(book === null){

    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  for( const genre of allGenres){
    for(const genre_book of book.genre){
      if(genre._id.toString() === genre_book._id.toString()){
          genre.checked ="true";
      }
    }
  }

  res.render("book_form", {
    title: "Update Book",
    authors: allAuthors,
    genres: allGenres,
    book: book,
  })
});

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  validateBookInput,

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);

      // Mark our selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.indexOf(genre._id) > -1) {
          genre.checked = "true";
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid. Update the record.
      const thebook = await Book.findByIdAndUpdate(req.params.id, book, {});
      // Redirect to book detail page.
      res.redirect(thebook.url);
    }
  }),
];