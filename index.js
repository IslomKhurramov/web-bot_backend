const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const token = "6446788710:AAFXDqq20gRrImECV_8D6eoavS0t76YheWE";
const anotherBotToken = "6805870358:AAGHQ8HKU4br3C3_L6ICWLwxtCMYx4RjN-w";
const multer = require("multer");
const express = require("express");
const app = express();
const port = 3000;
const bot = new TelegramBot(token, { polling: true });
const anotherBot = new TelegramBot(anotherBotToken, { polling: true });

mongoose.set("strictQuery", false);
const cors = require("cors");
app.use(cors());

const connectionString =
  "mongodb+srv://islomkhurramov:PyL0CpyKA3FcuDcz@cluster0.favewjz.mongodb.net/Web-Bot";
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const pictureSchema = new mongoose.Schema({
  data: { type: Buffer },
  contentType: String,
});

// Create the Picture model
const Picture = mongoose.model("Picture", pictureSchema);

const storage = multer.memoryStorage(); // Use memory storage for storing files as buffers
const uploader_member = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "OPTIONS, POST, GET, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/payment", uploader_member.single("picture"), async (req, res) => {
  console.log("Request to /payment received");
  try {
    // Check if the file was uploaded successfully
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Log information about the uploaded file
    console.log("Received file:", req.file);

    // Save the picture to MongoDB
    const picture = new Picture({
      data: req.file.buffer,
      contentType: req.file.mimetype,
    });

    // Log information about the saving process
    console.log("Saving picture to MongoDB...");

    await picture.save();
    const pictureId = picture._id;
    console.log("pic_id", pictureId);
    console.log("Picture saved successfully!");

    res.status(201).json({ pictureId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// app.get("/picture/:id", async (req, res) => {
//   try {
//     const pictureId = req.params.id;
//     const picture = await Picture.findById(pictureId);

//     if (!picture) {
//       return res.status(404).json({ message: "Picture not found" });
//     }

//     // Send the picture data in the response
//     res.json({
//       data: picture.data.toString("base64"), // Send the base64-encoded picture data
//       contentType: picture.contentType,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const bootstrap = () => {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    console.log("CHATID", chatId);

    if (text === "/start") {
      console.log("start");
      await bot.sendMessage(
        chatId,
        "Assalomu Aleykum, Welcome to Samarkand Chaykhana!",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "Menu",
                  web_app: {
                    url: "https://telegram-web-bot-with-react.vercel.app/",
                  },
                },
              ],
            ],
          },
        }
      );
    }
    if (msg.web_app_data?.data) {
      try {
        const data = JSON.parse(msg.web_app_data?.data);

        await bot.sendMessage(chatId, "Thank you for ordering!");

        if (Array.isArray(data.cartItems)) {
          // Process array of menu items
          for (const item of data.cartItems) {
            const message = `${item.title}-${item.quantity}x`;
            await bot.sendMessage(chatId, message);
            console.log("Item", item);
          }

          // Calculate and send the total price as a separate message
          const total = `Total price: ${data.cartItems.reduce(
            (a, c) => a + c.price * c.quantity,
            0
          )}`;
          await bot.sendMessage(chatId, total);
        } else {
          console.log("Invalid or missing cartItems array in data:", data);
        }

        // Process user data object
        if (typeof data.userData === "object") {
          const userMessage = `
      Name(Имя): ${data.userData.name}
      Number(Номер): ${data.userData.number}
      Option(Опция): ${data.userData.deliveryOption}
      Address(Адрес): ${data.userData.address}
      PaymentOption(Oплатa): ${data.userData.paymentOption}`;

          await bot.sendMessage(chatId, userMessage);

          // console.log("Deposited Photo URL:", data.userData?.deposited[0]);
          sendToAnotherBot(data);
        } else {
          console.log("Invalid or missing userData object in data:", data);
        }
        console.log("USERDATA", data);
        // await bot.sendPhoto(chatId, data.userData.deposited);
      } catch (err) {
        console.log(err);
        await bot.sendMessage(
          chatId,
          "Sorry, there was an error processing your order."
        );
      }
    }
  });
};
const sendToAnotherBot = async (data) => {
  console.log("USERDATA", data.userData);

  try {
    const savedPicture = await Picture.findById(data.userData.pictureId);
    console.log("saved picture", savedPicture);
    // Customize the message to send to the other bot
    const anotherBotChatId = "1039260019";
    const anotherBotMessage = `
      New Order Details:
      -------------------
      Name(Имя): ${data.userData.name}
      Number(Номер): ${data.userData.number}
      Option(Опция): ${data.userData.deliveryOption}
      Address(Адрес): ${data.userData.address}
      Payment Option(Oплатa): ${data.userData.paymentOption}
      -------------------
      Order Items:
      ${data.cartItems
        .map((item) => `${item.title} - ${item.quantity}x`)
        .join("\n")}
      -------------------
      Total Price: ${data.cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      )}
    `;

    // Send the message to the other bot
    await anotherBot.sendMessage(anotherBotChatId, anotherBotMessage);

    // If a picture was found, send it to the other bot as well
    if (savedPicture) {
      await anotherBot.sendPhoto(anotherBotChatId, savedPicture.data, {
        caption: "Order Picture",
      });
    }
  } catch (error) {
    console.error("Error sending data to another bot:", error);
  }
};

bootstrap();
