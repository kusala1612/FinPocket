

package com.finpocket.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import de.bwaldvogel.mongo.MongoServer;
import de.bwaldvogel.mongo.backend.memory.MemoryBackend;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.net.InetSocketAddress;

@Configuration
public class EmbeddedMongoConfig {

    private static final Logger logger = LoggerFactory.getLogger(EmbeddedMongoConfig.class);

    @Bean(destroyMethod = "shutdown")
    public MongoServer mongoServer() {
        MongoServer server = new MongoServer(new MemoryBackend());
        InetSocketAddress serverAddress = server.bind();
        logger.info("==================================================================");
        logger.info("Embedded in-memory MongoDB server started on port {}", serverAddress.getPort());
        logger.info("==================================================================");
        return server;
    }

    @Bean
    @Primary
    public MongoClient mongoClient(MongoServer mongoServer) {
        InetSocketAddress serverAddress = mongoServer.getLocalAddress();
        String connectionString = "mongodb://localhost:" + serverAddress.getPort() + "/finpocket_db";
        logger.info("Connecting Spring Data MongoDB to {}", connectionString);
        return MongoClients.create(connectionString);
    }
}
