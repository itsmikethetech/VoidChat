<?

global $_c;
global $_chat;

$_c["mysql_host"] = "127.0.0.1"; 	// MySQL hostname or IP address 
$_c["mysql_user"] = ""; 			// MySQL user
$_c["mysql_pass"] = "";				// MySQL password
$_c["mysql_db"] = "ajchat";			// MySQL database name

define("CPATH","/ajchat/"); // absolute path of URL [e.g. CPATH should be set to '/ajchat/' if you are running from http://www.ajchat.com/ajchat/ and '/' if you are running from http://www.ajchat.com ]
define("PREFIX","ac_"); // database table name prefix 

$_c["pass_hash"] = "ajiYl4f8z1Ago"; // Password hash code
$_c["session_length"] = 604800; // 60*60*24*7 -> 604800 -> 1 week (session cookie lifetime)

$_c["ajchat"] = "<b><span style=\"color: #666666\">aj</span><span style=\"color: #4260BF\">chat</span></b>";

?>