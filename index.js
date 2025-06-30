import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { ObjectId } from 'mongodb';
import { dbConnect } from './mongodb.js';
import { collectionNames } from './collectionNames.js';
import bcrypt from 'bcrypt';
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello");
});

app.get('/all-events', async (req, res) => {
  try {
    const events = await (await dbConnect(collectionNames.all_events)).find().sort({ createdAt: -1 }).toArray();
    res.send(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send({ error: "Failed to fetch events" });
  }
});
app.post('/add-event', async (req, res) => {
  const {
    title,
    name,
    email,
    date,
    time,
    location,
    description,
    attendeeCount,

  } = req.body;

  if (!title || !name || !date || !time || !location || !description) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const event = {
    title,
    name,
    email,
    date,
    time,
    location,
    description,
    attendeeCount,
    createdAt: new Date()
  };

  try {
    const result = await (await dbConnect(collectionNames.all_events)).insertOne(event);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ success: false, error: "Failed to add event" });
  }
});

app.get('/my-events/:email', async (req, res) => {
  const email = req.params.email;
  console.log(email);
  if (!email) {
    return res.status(400).json({ error: "Email query is required" });
  }

  try {
    const result = await (await dbConnect(collectionNames.all_events)).find({ email }).sort({ createdAt: -1 }).toArray();

    res.json(result);
  } catch (error) {
    console.error("Error fetching user events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// server.js or your main routes file
app.patch('/join-event/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    const eventsCollection = await dbConnect(collectionNames.all_events);
    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $inc: { attendeeCount: 1 } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ error: "Event not found or already joined" });
    }

    res.send({ success: true, message: "Joined event successfully" });
  } catch (err) {
    console.error("Error joining event:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get('/event/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
     const result = await (await dbConnect(collectionNames.all_events)).findOne({_id: new ObjectId(id)});
     console.log(result);
     res.send(result)
})

app.patch("/event/:id", async (req, res) => {
  const eventId = req.params.id;
  const updatedData = req.body;

  try {
    const collection = await dbConnect(collectionNames.all_events);
    const result = await collection.updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          title: updatedData.title,
          name: updatedData.name,
          date: updatedData.date,
          time: updatedData.time,
          location: updatedData.location,
          description: updatedData.description,
          attendeeCount: parseInt(updatedData.attendeeCount) || 0,
        },
      }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Event updated successfully." });
    } else {
      res.send({ success: false, message: "No changes made or event not found." });
    }
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

app.delete("/event/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const collection = await dbConnect(collectionNames.all_events);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0) {
      res.send({ success: true, message: "Event deleted successfully" });
    } else {
      res.status(404).send({ success: false, message: "Event not found" });
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});



app.get('/all-users', async (req, res) => {
  try {
    const users = await (await dbConnect(collectionNames.all_users)).find().toArray();
    res.send(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ error: "Failed to fetch users" });
  }
});

app.post('/all-users', async (req, res) => {
  const user = req.body;
  const email = req.body.email;
  const isEmailExist = await (await dbConnect(collectionNames.all_users)).findOne({email: email});
  if(isEmailExist){
    res.status(500).send({ error: "Email Alerady Exist" });
  } else{

      const hashedPassword = await bcrypt.hash(user.password, 10);
         const userToSave = {
          ...user,
          password: hashedPassword,
        };
      console.log(userToSave);
      
      try {
        const result = await (await dbConnect(collectionNames.all_users)).insertOne(userToSave);
        console.log(result);
        res.send(result);
      } catch (error) {
        console.error("Failed to insert user:", error);
        res.status(500).send({ error: "Failed to insert user" });
      }
}
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Find user by email
    const user = await (await dbConnect(collectionNames.all_users)).findOne({ email });

    if (!user) {
      return res.status(401).send({ error: "Invalid email or password" });
    }

    // Step 2: Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send({ error: "Invalid email or password" });
    }

    const { password: secret, ...userWithoutPassword } = user;

   console.log(userWithoutPassword);
    res.send(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});


async function run() {
  try {
    await dbConnect(collectionNames.all_users);
    console.log(chalk.cyan("Pinged your deployment. You successfully connected to MongoDB!"));
  } catch (error) {
    console.error(chalk.red("Failed to connect to MongoDB:", error));
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(chalk.yellow(`Server is running on port ${port}`));
});
