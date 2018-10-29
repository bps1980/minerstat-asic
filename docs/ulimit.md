![minerstat logo](https://cdn.rawgit.com/minerstat/minerstat-asic/master/docs/logo_full.svg)

# Set Ulimit on Linux

## 16.04 Ubuntu

This is only for the GUI version.


    # available limit
    root@ubuntu:~$ ulimit -n
    1024
    
    # add following lines to this file
    root@ubuntu:~$ sudo nano /etc/security/limits.conf
    
    * soft     nproc          unlimited    
    * hard     nproc          unlimited   
    * soft     nofile         unlimited   
    * hard     nofile         unlimited
    root soft     nproc          unlimited    
    root hard     nproc          unlimited  
    root soft     nofile         unlimited  
    root hard     nofile         unlimited
    
    # Save & Exit
    
    # edit the following file
    root@ubuntu:~$ sudo nano /etc/pam.d/common-session
    
    # add this line to it
    session required pam_limits.so
    
    # Reboot
    # After reboot
    
    root@ubuntu:~$ ulimit -n
    unlimited
    
