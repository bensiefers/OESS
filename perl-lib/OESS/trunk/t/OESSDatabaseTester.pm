package OESSDatabaseTester;

use strict;
use FindBin;
use GRNOC::Config;
use Data::Dumper;
use DBI;

$ENV{"PATH"} = "";

sub getConfigFilePath{
    my $cwd = $FindBin::Bin;
    $cwd =~ /(.*)/;
    $cwd = $1;
    return "$cwd/conf/database.xml";
}

sub getConfig { 
    my $cwd = $FindBin::Bin;
    $cwd =~ /(.*)/;
    $cwd = $1;
    my $cfg                 = GRNOC::Config->new(config_file => "$cwd/conf/database.xml");
    my $user                = $cfg->get('/config/credentials[1]/@username')->[0];
    my $pass                = $cfg->get('/config/credentials[1]/@password')->[0];
    my $db                  = $cfg->get('/config/credentials[1]/@database')->[0];
    my $result = {"user"   => $user,
                  "pass"   => $pass,
                  "db"     => $db
    };

    return $result;
}

sub resetSNAPPDB {

    my $creds = &getConfig();
    #drop the snapp-test DB if it exists, and then create it.
    my %attr = (PrintError => 0, RaiseError => 0);
    my $dbh = DBI->connect("DBI:mysql:dbname=;host=localhost;port=6633",$creds->{'user'},$creds->{'pass'},\%attr);
    $dbh->do("create database " . 'snapp_test' );
    $dbh->do("set foreign_key_checks = 0");
    
    my $cwd = $FindBin::Bin;
    $cwd =~ /(.*)/;
    $cwd = $1;
    
    my $command = "/usr/bin/mysql -u $creds->{'user'} --password=$creds->{'pass'} snapp_test < $cwd/conf/snapp_known_state.sql";
    if (system($command)){
        return 0;
    }

    #this goes and sets up the snapp directory for the tests

    $dbh->do("DROP TABLE IF EXISTS `global`;");

    $dbh->do("CREATE TABLE `global` (
          `name` varchar(64) DEFAULT NULL,
            `value` varchar(256) DEFAULT NULL,
              KEY `k_ind` (`name`) USING BTREE
              ) ENGINE=InnoDB DEFAULT CHARSET=latin1;");

    $dbh->do("LOCK TABLES `global` WRITE;");
    $dbh->do("INSERT INTO `global` VALUES ('rrddir','$cwd/conf/SNMP/snapp/db/');");

    $dbh->do("UNLOCK TABLES;");

    $dbh->do("set foreign_key_checks = 1"); 

    return 1;
}

sub resetOESSDB {
    my $creds = &getConfig();
    #drop the oess-test DB if it exists, and then create it
    my %attr = (PrintError => 0, RaiseError => 0);
    my $dbh = DBI->connect("DBI:mysql:dbname=;host=localhost;port=6633",$creds->{'user'},$creds->{'pass'},\%attr);
    $dbh->do("create database " . $creds->{'db'});
    $dbh->do("set foreign_key_checks = 0");
    #reset the SNAPP DB this one does the schema
    my $cwd = $FindBin::Bin;
    $cwd =~ /(.*)/;
    $cwd = $1;
    my $command = "/usr/bin/mysql -u $creds->{'user'} --password=$creds->{'pass'} $creds->{'db'} < $cwd/conf/oess_known_state.sql";
    if (system($command)){
        return 0;
    }

    $dbh->do("set foreign_key_checks = 1");
    return 1;
}


1;
