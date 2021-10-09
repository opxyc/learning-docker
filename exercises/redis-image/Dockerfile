# Use an existing Docker image as base
FROM alpine

# Download and install a dependency
# RUN - Used to run command inside the image
RUN apk add --update redis

# Tell the image what to do when it starts as a container
# CMD - Used to specify the start up script
CMD ["redis-server"]