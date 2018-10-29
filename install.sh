#!/bin/bash

# Install script for minerstat asic node
echo "****** minerstat asic node ******"
sudo apt-get install git g++ build-essential curl

# Check LIMITS
ULIMIT=$(ulimit -n)

if [ "$ULIMIT" != "unlimited" ]; then
	echo ""
	echo "!--------------------------------------------"
	echo "Make sure you are using 'UNLIMITED' ulimits."
	echo "Here's your current connection/file limit:"
	echo $ULIMIT
	echo ""
	echo "Read more: https://github.com/minerstat/minerstat-asic/blob/master/docs/ulimit.md"
	echo "--------------------------------------------!"
	echo ""
fi

# Check NODE JS
if which node > /dev/null
then
    echo "node is installed, skipping..."
else
    echo "Installing NODE JS"
    curl -sL https://deb.nodesource.com/setup_9.x -o nodesource_setup.sh
	sudo add-apt-repository ppa:ubuntu-toolchain-r/test
	sudo apt-get update
	sudo bash nodesource_setup.sh
	sudo apt-get install nodejs
	sudo npm install -g node-gyp
fi

# Download minerstat asic
DIR=${PWD}

if [ ! -d "$DIR/minerstat-asic" ]; then
	git clone https://github.com/minerstat/minerstat-asic
	cd minerstat-asic
	npm install
else
	cd minerstat-asic
	git pull
fi

# Run
node backend console headless
