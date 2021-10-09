# Use Node as the base image 
FROM node:alpine

# Set working directory
WORKDIR /usr/app

# Copy Build files
# Copy the package.json file first and run npm install 
# since npm depends only that file for resolving dependencies
COPY ./package.json .
# Install the dependencies
RUN npm install
# After we install the dependencies, copy all other files
COPY . .
# Files will be copied:
# from:
#   the path where the this Docker file is placed(context)
# to:
#   the WORKDIR -> /usr/app

# Default command
CMD ["npm","start"]