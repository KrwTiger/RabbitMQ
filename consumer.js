const amqp = require("amqplib");
const mysql = require("mysql2/promise");

const rabbitmqUrl = "amqp://localhost";
const queue = "orders";
let connection, channel, connectSQL;

// สร้าง connection กับ MySQL
async function initMySQL() {
    try {
        connectSQL = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'tutorial'
        });
        console.log('Connected to MySQL');
    } catch (error) {
        console.error('Error connecting to MySQL:', error);
        setTimeout(initMySQL, 5000); // Attempt to reconnect after 5 seconds
    }
}

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
        channel.prefetch(1);

        channel.consume(queue, async (msg) => {
            const order = JSON.parse(msg.content.toString());

            const sql = "INSERT INTO orders SET ?";
            try {
                const [results] = await connectSQL.query(sql, order);
                console.log("Order saved to database with id: " + results.insertId);
                channel.ack(msg);
            } catch (error) {
                console.error("Failed to save order to database:", error);
                channel.nack(msg); // Not acknowledged, message will be requeued
            }
        });

        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("Failed to connect to RabbitMQ", error); 
        setTimeout(createConnection, 5000); // Attempt to reconnect after 5 seconds
    }
}

initMySQL();
createConnection();
