#!/usr/bin/perl

use strict;
use warnings;
use GRNOC::RabbitMQ::Client;
use GRNOC::Config;

package OESS::RabbitMQ::Client;

sub new{
    my $that = shift;
    my $class = ref($that) || $that;

    my %args = (
        @_
        );

    
    my $config = GRNOC::Config->new(config_file => '/etc/oess/database.xml');
    
    my $user = $config->get('/config/rabbitMQ/@user')->[0];
    my $pass = $config->get('/config/rabbitMQ/@pass')->[0];
    my $host = $config->get('/config/rabbitMQ/@host')->[0];
    my $port = $config->get('/config/rabbitMQ/@port')->[0];

    my $rabbit = GRNOC::RabbitMQ::Client->new( host => $host,
					       pass => $pass,
					       user => $user,
					       port => $port,
					       timeout => $args{'timeout'},
					       exchange => 'OESS',
					       topic => $args{'topic'},
					       queue => $args{'queue'} );

    return $rabbit;

}

1;


