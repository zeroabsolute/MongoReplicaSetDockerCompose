const Mongoose = require('mongoose');
const Express = require('express');
const Router = require('express').Router;
const BodyParser = require('body-parser');
const Cors = require('cors');

/**
 * DB connection & Schema definition
 */

Mongoose.connect('mongodb://mongo1:27018,mongo2:27019,mongo3:27020/test?replicaSet=rs0', (err) => {
  if (err) {
    throw err;
  }
});

const ROLES_TABLE = 'roles';
const USERS_TABLE = 'users';

const roleSchema = new Mongoose.Schema({
  name: { type: Mongoose.Schema.Types.String, required: true },
}, { timestamps: true });
const Role = Mongoose.model(ROLES_TABLE, roleSchema);

const userSchema = new Mongoose.Schema({
  email: { type: Mongoose.Schema.Types.String, required: true },
  firstName: { type: Mongoose.Schema.Types.String, required: false },
  lastName: { type: Mongoose.Schema.Types.String, required: false },
  role: { type: Mongoose.Schema.Types.ObjectId, reqired: true },
}, { timestamps: true });
const User = Mongoose.model(USERS_TABLE, userSchema);

/**
 * Express server setup & test endpoints definition
 */

const PORT = 5000;
const app = Express();
const server = require('http').Server(app);
const router = new Router();

router.route('/users').post(async (req, res) => {
  const session = await Mongoose.connection.startSession();

  try {
    session.startTransaction();

    const options = { session };
    let existingRole = await Role.findOne({ name: req.body.role });

    if (!existingRole) {
      existingRole = (await Role.create([{ name: req.body.role }], options))[0];
    }

    const userBody = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: existingRole._id,
    };
    const createdUser = (await User.create([userBody], options))[0];

    session.commitTransaction();
    res.status(201).json(createdUser);
  } catch (e) {
    session.abortTransaction();
    res.status(500).json(e);
  }
});

router.route('/users').get(async (req, res) => {
  try {
    const result = await User.aggregate([
      {
        $lookup: {
          from: ROLES_TABLE,
          localField: 'role',
          foreignField: '_id',
          as: 'role',
        }
      }, {
        $unwind: '$role',
      }
    ]);

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
});

app.use(Cors());
app.use(BodyParser.json({ limit: '10mb' }));
app.use(BodyParser.urlencoded({ limit: '10mb', extended: false }));
app.use(router);

server.listen(PORT, (error) => {
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