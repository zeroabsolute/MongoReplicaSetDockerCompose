const Mongoose = require('mongoose');
const Express, { Router } = require('express');
const BodyParser = require('body-parser');

/**
 * DB connection & Schema definition
 */

Mongoose.connect('mongodb://localhost:27018,localhost:27019,localhost:27020/test?replicaSet=rs0', {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
}, (err) => {
  throw err;
});

const roleSchema = new Mongoose.Schema({
  name: { type: Mongoose.Schema.Types.String, required: true },
}, { timestamps: true });
const Role = Mongoose.model('Role', roleSchema);

const userSchema = new Mongoose.Schema({
  email: { type: Mongoose.Schema.Types.String, required: true },
  firstName: { type: Mongoose.Schema.Types.String, required: false },
  lastName: { type: Mongoose.Schema.Types.String, required: false },
}, { timestamps: true });
const User = Mongoose.model('User', userSchema);

/**
 * Express server setup & test endpoints definition
 */

const app = Express();
const server = require('http').Server(app);
const router = new Router();

router.route('/users').post(async (req, res) => {
  const session = await Mongoose.connection.startSession();
  
  try {
    session.startTransaction();
    const options = { session };
    let existingRole = await Role.find({ name: req.body.role });

    if (!existingRole) {
      existingRole = await Role.create([{ name: req.body.role }], options)[0];
    }

    const userBody = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    };
    const createdUser = await User.create([userBody], options);

    await session.commitTransaction();
    session.endSession();
    res.status(201).json(createdUser);
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json(e);
  }
});

router.route('/users').get(async (req, res) => {
  try {
    const result = await User.find();

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
});

app.use(Cors());
app.use(BodyParser.json({ limit: '10mb' }));
app.use(BodyParser.urlencoded({ limit: '10mb', extended: false }));
app.use(router);

server.listen(5000, (error) => {
  if (error) {
    console.log(`
          \n\n
          --------------------------------
          --------------------------------
          API:
          Status: Error
          Log: ${error}
          --------------------------------
          --------------------------------
          \n\n`
    );
  } else {
    console.log(`
          \n\n
          --------------------------------
          --------------------------------
          API:
          Name: Express API
          Port: ${PORT}
          Status: OK
          --------------------------------
          --------------------------------
          \n\n`
    );
  }
});