const Genre = require("../models/genre");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const validateGenreName = [
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),
];

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find().sort({ name: 1 }).exec();

  res.render("genre_list", {
    title: "Genre List",
    genre_list: allGenres,
  })
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {

  const [genre, bookInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, "title summary").exec(),
  ]);

  if(genre == null){
    const err = new Error("Genre not found.");
    err.status = 404;
    return next(err)
  }

  res.render("genre_details", {
    title: "Genre Details",
    genre: genre,
    genre_books: bookInGenre,
  });
});

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", {title: " Create Genre "});
};

// Handle Genre create on POST.
exports.genre_create_post = [validateGenreName, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);

  //create a genre object with escaped and trimmed data
  const genre = new Genre({name: req.body.name});

  if(!errors.isEmpty()){
    res.render("genre_form", {
      title: "Create Genre",
      genre: genre,
      errors: errors.array(),
    });
    return;
  }
  else{
    const genreExists = await Genre.findOne({ name: req.body.name }).exec();
    if (genreExists){
      res.redirect(genreExists.url);
    }
    else{
      await genre.save();
      res.redirect(genre.url);
    }
  }
}),
];

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {

  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id}, "title summary"),
  ]);

  if(genre === null){
    res.redirect("/catalog/genres");
  }

  res.render("genre_delete", {
    title: "Genre Delete",
    genre: genre,
    genre_books: booksInGenre,
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {

  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id}, "title summary"),
  ]);

  if(booksInGenre > 0){
    res.render("author_delete", {
      title: "Genre Delete",
      genre: genre,
      genre_books: booksInGenre,
    });
    return;
  }

  else{
    await Genre.findByIdAndRemove(req.body.genreid);
    res.redirect('/catalog/genres')
  }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  res.send("NOT IMPLEMENTED: Genre update GET");
});

// Handle Genre update on POST.
exports.genre_update_post = asyncHandler(async (req, res, next) => {
  res.send("NOT IMPLEMENTED: Genre update POST");
});
