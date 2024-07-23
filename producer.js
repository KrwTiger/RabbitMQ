const amqp = require("amqplib");
const { v4: uuidv4 } = require("uuid");

const rabbitmqUrl = "amqp://localhost";
const queue = "orders";
let connection, channel;

async function createConnection() {
  try {
    connection = await amqp.connect(rabbitmqUrl);

    connection.on("error", (err) => {
      console.error("Connection error", err);
      setTimeout(createConnection, 5000); // Attempt to reconnect after 5 seconds
    });

    connection.on("close", () => {
      console.error("Connection closed");
      setTimeout(createConnection, 5000); // Attempt to reconnect after 5 seconds
    });

    channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
    setTimeout(createConnection, 5000); // Attempt to reconnect after 5 seconds
  }
}

async function sendOrder(order) {
  if (!channel) {
    console.error("Channel is not available");
    return;
  }

  try {
    const bufferData = Buffer.from(JSON.stringify(order));
    channel.sendToQueue(queue, bufferData, { persistent: true });
    console.log("Send data:", order);
    console.log("is completed");
  } catch (error) {
    console.error("Failed to send message", error);
  }
}

const order = {
  orderNumber: uuidv4(),
  productName: "apple",
  qty: 10,
};

createConnection();

// Example usage: send an order every 10 seconds
setInterval(() => {
  sendOrder(order);
}, 10000); // Send order every 10 seconds
