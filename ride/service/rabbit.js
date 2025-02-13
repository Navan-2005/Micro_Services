const amqp = require('amqplib');

// Get RabbitMQ URL from environment variables with a fallback
const RABBITMQ_URL = process.env.RABBIT_URL || 'amqp://localhost:5672';

let connection, channel;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

async function connect() {
    try {
        if (connection && channel) {
            return; // Already connected
        }

        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        // Reset connection retries on successful connection
        connectionRetries = 0;
        
        console.log('Successfully connected to RabbitMQ');

        // Handle connection errors and closures
        connection.on('error', handleConnectionError);
        connection.on('close', handleConnectionClose);
        
        // Handle channel errors
        channel.on('error', (error) => {
            console.error('Channel error:', error);
        });

        channel.on('close', () => {
            console.warn('Channel closed, attempting to reconnect...');
            channel = null;
            handleConnectionClose();
        });

    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        await handleConnectionError(error);
    }
}

async function handleConnectionError(error) {
    console.error('RabbitMQ connection error:', error);
    
    if (connectionRetries < MAX_RETRIES) {
        connectionRetries++;
        console.log(`Retrying connection (${connectionRetries}/${MAX_RETRIES}) in ${RETRY_INTERVAL/1000} seconds...`);
        
        setTimeout(async () => {
            await connect();
        }, RETRY_INTERVAL);
    } else {
        console.error('Max connection retries reached. Please check RabbitMQ server and restart the application.');
        process.exit(1);
    }
}

async function handleConnectionClose() {
    console.warn('RabbitMQ connection closed');
    connection = null;
    channel = null;
    await handleConnectionError(new Error('Connection closed'));
}

async function ensureConnection() {
    if (!channel || !connection) {
        await connect();
    }
}

async function subscribeToQueue(queueName, callback) {
    try {
        await ensureConnection();
        
        // Assert queue with options for better reliability
        await channel.assertQueue(queueName, {
            durable: true,  // Queue survives broker restart
            autoDelete: false // Queue is not deleted when last consumer unsubscribes
        });

        console.log(`Subscribing to queue: ${queueName}`);
        
        channel.consume(queueName, async (message) => {
            if (!message) {
                console.warn(`Null message received from queue ${queueName}`);
                return;
            }

            try {
                const data = message.content.toString();
                console.log(`Received message from ${queueName}:`, data);
                
                await callback(data);
                channel.ack(message);
                
            } catch (error) {
                console.error(`Error processing message from ${queueName}:`, error);
                // Negative acknowledge and requeue the message
                channel.nack(message, false, true);
            }
        }, {
            noAck: false // Enable manual acknowledgment
        });

    } catch (error) {
        console.error(`Error subscribing to queue ${queueName}:`, error);
        throw error;
    }
}

async function publishToQueue(queueName, data) {
    try {
        await ensureConnection();
        
        // Assert queue before publishing
        await channel.assertQueue(queueName, {
            durable: true,
            autoDelete: false
        });

        const success = channel.sendToQueue(queueName, Buffer.from(data), {
            persistent: true // Message survives broker restart
        });

        if (!success) {
            throw new Error('Message was not successfully published to queue');
        }

        console.log(`Published message to ${queueName}:`, data);
        
    } catch (error) {
        console.error(`Error publishing to queue ${queueName}:`, error);
        throw error;
    }
}

// Cleanup function for graceful shutdown
async function closeConnection() {
    try {
        if (channel) {
            await channel.close();
        }
        if (connection) {
            await connection.close();
        }
        console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
        console.error('Error closing RabbitMQ connection:', error);
        throw error;
    }
}

// Handle application shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Closing RabbitMQ connection...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Closing RabbitMQ connection...');
    await closeConnection();
    process.exit(0);
});

module.exports = {
    connect,
    subscribeToQueue,
    publishToQueue,
    closeConnection
};