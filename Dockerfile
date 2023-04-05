# Use the official Node.js 14 image as the base image
FROM node:latest AS chameleon

# Set the working directory inside the container
WORKDIR /app

COPY . .

# Install dependencies
# RUN apt-get update && apt-get install -y git yarn
# RUN npm install -g yarn
# RUN yarn init -y
RUN yarn add express

RUN yarn install
# Expose port 3000
EXPOSE 3000

# Set the command to run the node server
CMD ["node", "app.js"]
