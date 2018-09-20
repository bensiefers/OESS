package OESS::Cloud::AWS;

use strict;
use warnings;

use Data::Dumper;
use Log::Log4perl;
use Paws;
use XML::Simple;

sub new {
    my $class = shift;
    my $self  = {
        config => '/etc/oess/database.xml',
        logger => Log::Log4perl->get_logger('OESS.Cloud.AWS'),
        @_
    };
    bless $self, $class;

    $self->{creds} = XML::Simple::XMLin($self->{config});
    $self->{connections} = {};

    foreach my $conn (@{$self->{creds}->{cloud}->{connection}}) {
        $self->{connections}->{$conn->{interconnect_id}} = $conn;
    }
    return $self;
}

=head2 allocate_connection
=cut
sub allocate_connection {
    my $self = shift;
    my $interconnect_id = shift;
    my $connection_name = shift;
    my $owner_account = shift;
    my $tag = shift;
    my $bandwidth = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->AllocateHostedConnection(
        Bandwidth => $bandwidth,
        ConnectionId => $interconnect_id,
        ConnectionName => $connection_name,
        OwnerAccount => $owner_account,
        Vlan => $tag
    );

    # TODO: Find failure modes and log as error
    warn Dumper($resp);

    $self->{logger}->info("Allocated AWS Connection $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount} with VLAN $resp->{Vlan}.");
    return $resp;
}

=head2 delete_connection
=cut
sub delete_connection {
    my $self = shift;
    my $interconnect_id = shift;
    my $connection_id = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->DeleteConnection(
        ConnectionId => $connection_id
    );

    warn Dumper($resp);

    $self->{logger}->info("Removed AWS Connection $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount} with VLAN $resp->{Vlan}.");
    return $resp;
}

=head2 allocate_vinterface
=cut
sub allocate_vinterface {
    my $self = shift;
    my $interconnect_id = shift;
    my $owner_account = shift;
    my $addr_family = shift;
    my $amazon_addr = shift;
    my $asn = shift;
    my $auth_key = shift;
    my $customer_addr = shift;
    my $vinterface_name = shift;
    my $tag = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $allocation = {
        Asn => $asn,
        VirtualInterfaceName => $vinterface_name,
        Vlan => $tag
    };
    if (defined $addr_family) {
        $allocation->{AddressFamily} = $addr_family;
    }
    if (defined $amazon_addr) {
        $allocation->{AmazonAddress} = $amazon_addr;
    }
    if (defined $auth_key) {
        $allocation->{AuthKey} = $auth_key;
    }
    if (defined $customer_addr) {
        $allocation->{CustomerAddress} = $customer_addr;
    }

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->AllocatePrivateVirtualInterface(
        ConnectionId => $interconnect_id,
        OwnerAccount => $owner_account,
        NewPrivateVirtualInterfaceAllocation => $allocation
    );

    # TODO: Find failure modes and log as error
    warn Dumper($resp);

    $self->{logger}->info("Allocated AWS Virtual Interface $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount} with VLAN $resp->{Vlan}.");
    return $resp;
}

=head2 delete_vinterface
=cut
sub delete_vinterface {
    my $self = shift;
    my $interconnect_id = shift;
    my $vinterface_id = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->DeleteVirtualInterface(
        VirtualInterfaceId => $vinterface_id
    );

    warn Dumper($resp);

    $self->{logger}->info("Removed AWS Virtual Interface $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount} with VLAN $resp->{Vlan}.");
    return $resp;
}

=head2 create_bgp_peer
=cut
sub create_bgp_peer {
    my $self = shift;
    my $interconnect_id = shift;
    my $vinterface_id = shift;
    my $addr_family = shift;
    my $amazon_addr = shift;
    my $asn = shift;
    my $auth_key = shift;
    my $customer_addr = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->CreateBGPPeer(
        NewBGPPeer => {
            AddressFamily => $addr_family,
            AmazonAddress => $amazon_addr,
            Asn => $asn,
            AuthKey => $auth_key,
            CustomerAddress => $customer_addr
        },
        VirtualInterfaceId => $vinterface_id
    );

    warn Dumper($resp);

    $self->{logger}->info("Added BGP Peer for AWS Virtual Interface $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount}.");
    return $resp;
}

=head2 delete_bgp_peer
=cut
sub delete_bgp_peer {
    my $self = shift;
    my $asn = shift;
    my $customer_address = shift;
    my $interconnect_id = shift;
    my $vinterface_id = shift;

    $ENV{'AWS_ACCESS_KEY'} = $self->{connections}->{$interconnect_id}->{access_key};
    $ENV{'AWS_SECRET_KEY'} = $self->{connections}->{$interconnect_id}->{secret_key};

    my $dc = Paws->service(
        'DirectConnect',
        region => $self->{connections}->{$interconnect_id}->{region}
    );
    my $resp = $dc->DeleteBGPPeer(
        Asn => $asn,
        CustomerAddress => $customer_address,
        VirtualInterfaceId => $vinterface_id
    );

    warn Dumper($resp);

    $self->{logger}->info("Removed BGP Peer from AWS Virtual Interface $resp->{ConnectionId} on $self->{connections}->{$interconnect_id}->{region} for $resp->{OwnerAccount} with ASN $asn.");
    return $resp;
}

1;
