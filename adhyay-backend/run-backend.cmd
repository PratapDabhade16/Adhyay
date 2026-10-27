@echo off
set "JAVA_HOME=C:\Users\Pratap\Desktop"
set "PATH=C:\Users\Pratap\Desktop\bin;%PATH%"
cd /d "%~dp0"
call .\mvnw.cmd spring-boot:run
