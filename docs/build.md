![minerstat logo](https://cdn.rawgit.com/minerstat/minerstat-asic/master/docs/logo_full.svg)

# Build minerstat ASIC software from source.

You can make changes for yourself or send recommendations to us trough github pull request.

## Select platform <img alt="Status" src="https://ci.appveyor.com/api/projects/status/github/coinscrow/minerstat-asic?branch=master&svg=true" alt="Build">

- [Windows](#windows)

- [Linux](#linux)

- [Mac](#mac)

- [Raspberry](#raspberry)

- [Executable](#executable)

## [Windows](#windows)

1) Download and Install


| Git | NodeJS |
|--|--|
| <a href='https://git-scm.com/download/win'><img alt="Download" src="https://cdn.rawgit.com/minerstat/minerstat-asic/master/docs/button_download.svg" width="95%"></a> | <a href='https://nodejs.org/en/'><img alt="Download" src="https://cdn.rawgit.com/minerstat/minerstat-asic/master/docs/button_download.svg" width="95%"></a> | 

Open PowerShell

    npm install --global --production windows-build-tools

Now you are ready to clone and install minerstat ASIC

    npm install -g node-gyp
    npm install -g electron-packager
    git clone https://github.com/minerstat/minerstat-asic/
    cd minerstat-asic
    npm install

You can start the software with

    npm start


## [Linux](#linux)

Open Terminal / SSH

    # Prepare
    sudo apt-get update
    cd ~
    curl -sL https://deb.nodesource.com/setup_9.x -o nodesource_setup.sh
    sudo bash nodesource_setup.sh
    # Install Git & NodeJS
    sudo apt-get install nodejs git g++ build-essential
    
Now you are ready to clone and install minerstat ASIC  

    sudo npm install -g node-gyp
    sudo npm install -g electron-packager
    git clone https://github.com/minerstat/minerstat-asic/
    cd minerstat-asic
    npm install

You can start the software with

    npm start


## [Mac](#mac)

Follow the steps on the How to Install [HomeBrew](https://treehouse.github.io/installation-guides/mac/homebrew) on a Mac instruction guide to install Homebrew 

Open the Terminal app and type 

    xcode-select --install
    brew update

This updates Homebrew with a list of the latest version of Node.

    brew install node.


Sit back and wait. Homebrew has to download some files and install them. But that’s it.


Now you are ready to clone and install minerstat ASIC  

    npm install -g node-gyp
    npm install -g electron-packager
    git clone https://github.com/minerstat/minerstat-asic/
    cd minerstat-asic
    rm package.json
    cp package-armv7l.json package.json
    npm install

You can start the software with

    npm start




## [Raspberry](#raspberry)

Open Terminal / SSH

    # Prepare
    sudo apt-get update
    cd ~
    curl -sL https://deb.nodesource.com/setup_9.x -o nodesource_setup.sh
    sudo bash nodesource_setup.sh
    # Install Git & NodeJS
    sudo apt-get install nodejs git g++ build-essential
    
Now you are ready to clone and install minerstat ASIC  
    
    sudo npm install -g node-gyp
    sudo npm install -g electron-packager
    git clone https://github.com/minerstat/minerstat-asic/
    cd minerstat-asic
    rm package.json
    cp package-armv7l.json package.json
    npm install

You can start the software with

    npm start


## [Executable](#executable)

LINUX `npm run-script package-linux`

WINDOWS `npm run-script package-win`

MAC  `npm run-script package-mac`

RASPBERRY PI `npm run-script package-pi`


/*

***© minerstat OÜ*** in 2018


***Contact:*** app [ @ ] minerstat.com 


***Mail:*** Sepapaja tn 6, Lasnamäe district, Tallinn city, Harju county, 15551, Estonia

*/
