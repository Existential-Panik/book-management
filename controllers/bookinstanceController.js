const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");

const { body, validationResult} = require("express-validator");
const book = require("../models/book");

const validateBookInstance = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength( {min: 1} )
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

];

// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
  const allBookInstances = await BookInstance.find().populate("book").exec();

  res.render("bookinstance_list", {
    title: "Book Instance List",
    bookinstancelist: allBookInstances,
  })
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate('book').exec();

  if (bookInstance == null) {
   const err = new Error("There are no book instances.");
   err.status = 404;
   return next(err)
  }

  res.render("bookinstance_detail",
  {title: "Book Instance Detail",
book_instance: bookInstance});

});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {

  const bookList = await Book.find({}, "title").exec();

  res.render("bookinstance_form", {
    title: "Create Book Instances",
    book_list: bookList,
  });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post =[

  validateBookInstance,
  
  asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);

  const bookInstance = new BookInstance({
    book: req.body.book,
    imprint: req.body.imprint,
    status: req.body.status,
    due_back: req.body.due_back,
  });

  if(!errors.isEmpty){
    const allBooks = await Book.find({}, "title").exec();

    res.render("bookinstance_form", {
      title: "Create Book Instance",
      book_list: allBooks,
      selected_book: bookInstance.book._id,
      errors: errors.array(),
      bookinstance: bookInstance,
    });
    return
  }
  else {
    await bookInstance.save();
    res.redirect(bookInstance.url);
  }
}),
]

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).exec();

  if (bookInstance === null){
    res.redirect("/catalog/bookinstances");
  }

  res.render("bookinstance_delete", {
    title: "Delete Book Copy",
    book_instance: bookInstance,
  })
});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).exec();

  
  await BookInstance.findByIdAndRemove(req.body.book_instanceid);
  res.redirect("/catalog/bookinstances");
  
  
});

// Display BookInstance update form on GET.
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
  const [bookInstance, allBooks] = await Promise.all([
    BookInstance.findById(req.params.id).populate("book").exec(),
    Book.find()
  ]);

  if(bookInstance == null){
    const error = new Error("Book Instance not found.");
    error.status = 404;
    return next(error);
  }

  res.render("bookinstance_form", {
    book_list: allBooks,
    selected_book: bookInstance.book._id,
    bookinstance: bookInstance
  });
});

// Handle bookinstance update on POST.
exports.bookinstance_update_post =[ validateBookInstance,asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);

  const bookInstance = new BookInstance({
    book: req.body.book,
    imprint: req.body.imprint,
    status: req.body.status,
    due_back: req.body.due_back,
    _id: req.params.id,
  });

  if (!errors.isEmpty()) {
    const allBooks = await Book.find({}, "title").exec();

      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        errors: errors.array(),
        bookinstance: bookInstance,
      });
      return;
  }
  else{
    // Data from form is valid.
      await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {});
      
    res.redirect(bookInstance.url);
  }
})
];
