export function createCollegeController(req, res) {
  const userId = req.auth.sub; // Clerk user ID
  const email = req.auth.email; // Clerk email if available

  res.json({
    message: "College created successfully 🎓",
    createdBy: userId,
    email: email,
  });
}
