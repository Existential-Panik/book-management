const Author = require("../models/author");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const { body, validattionResult, validationResult} = require("express-validator");

const validateAuthorInput = [
  body("first_name")
    .trim()
    .isLength( {min: 1} )
    .escape()
    .withMessage("First name must be specified"),
  
  body("family_name")
    .trim()
    .isLength( {min: 1} )
    .escape()
    .withMessage("Family name must be specified"),
  
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
];
// Display list of authors.
exports.author_list = asyncHandler(async (req, res, next) => {
  const authorList = await Author.find().sort({ family_name: 1}).exec();

  res.render("author_list",{ title: "AuthorList", authors: authorList} )
})

exports.author_detail = (async (req, res, next) => {

  const [ author, bookAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id}, "title summary").exec(),
  ]);

  if (bookAuthor == null) {
    const err = new Error("There are no books from this author.");
    err.status = 404;
    return next(err);
  }

  res.render("author_details", {
    title: "Author Details",
    author: author,
    author_book: bookAuthor,
  });
})

exports.author_create_get = (req, res, next) => {

  res.render("author_form", { title: "Create Author"});
};

// Handle Author create on POST.
exports.author_create_post = [validateAuthorInput, asyncHandler(async (req, res, next) => {

  const errors = validationResult(req);

  const author = new Author( {
    first_name: req.body.first_name,
    family_name: req.body.family_name,
    date_of_birth: req.body.date_of_birth,
    date_of_death: req.body.date_of_death,
  });
  if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render("author_form", {
        title: "Create Author",
        author: author,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.

      // Save author.
      await author.save();
      // Redirect to new author record.
      res.redirect(author.url);
    }
}),
];

// Display Author delete form on GET.
exports.author_delete_get = asyncHandler(async (req, res, next) => {
  const [author, booksWithAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({author: req.params.id}, "title sumamry").exec()
  ]);

  if(author === null){
    res.redirect("/catalog/authors");
  }

  res.render("author_delete", {
    title: "Delete Author",
    author: author,
    author_books: booksWithAuthor,
  });
});

// Handle Author delete on POST.
exports.author_delete_post = asyncHandler(async (req, res, next) => {
  // Get details of author and all their books (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (allBooksByAuthor > 0){
    res.render("author_delete", {
      title: "Delete Author",
      author: author,
      author_books: allBooksByAuthor,
    });
    return;
  } 
  else {
    await Author.findByIdAndRemove(req.body.authorid);
    res.redirect('/catalog/authors');
  }
});

// Display Author update form on GET.
exports.author_update_get = asyncHandler(async (req, res, next) => {
  const author = await Author.findById(req.params.id).exec();

  if (author == null){
    // No results

    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }

  res.render('author_form',{
    author: author
  })
});

// Handle Author update on POST.
exports.author_update_post = [ validateAuthorInput, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);

  const author = new Author({
    first_name: req.body.first_name,
    family_name: req.body.family_name,
    date_of_birth: req.body.date_of_birth,
    date_of_death: req.body.date_of_death,
    _id: req.params.id
  })

  if(!errors.isEmpty()){
    res.render('author_form', {
      author: author,
      errors: errors.array()
    });
    return;
  }
  else{
    await Author.findByIdAndUpdate(req.params.id, author);
    res.redirect(author.url);
  }
}) 
];