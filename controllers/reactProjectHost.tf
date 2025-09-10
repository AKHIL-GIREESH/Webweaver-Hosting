provider "aws" {
  region = "ap-south-1"
}

# Read the content of the title.txt file which will be used for both the instance name and the subdomain
data "local_file" "project_title" {
  filename = "title.txt"
}

# Data source to get the Hosted Zone ID
# NOTE: Replace "yourdomain.com." with your actual domain name
data "aws_route53_zone" "main" {
  name = "webweaver.live"
}

# Create a Route 53 A record for the dynamic subdomain, using the project title
resource "aws_route53_record" "dynamic_record" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${data.local_file.project_title.content}.${data.aws_route53_zone.main.name}"
  type    = "A"
  ttl     = 300
  # Points to the public IP of the EC2 instance
  records = [aws_instance.web.public_ip]
}

resource "aws_instance" "web" {
  ami                    = "ami-0b67de98507b2cb4e"
  instance_type          = "t2.medium"
  key_name               = aws_key_pair.rsaa.id
  vpc_security_group_ids = [aws_security_group.ssh-access.id]

  tags = {
    # Use the content of the title.txt file for the instance name
    Name = data.local_file.project_title.content
  }

  provisioner "local-exec" {
    command = "echo ${self.public_ip} > instance_ip.txt"
  }
}

resource "aws_key_pair" "rsaa" {
  public_key = file("/Users/akhilgireesh/.ssh/id_rsa.pub")
}

resource "aws_security_group" "ssh-access" {
  name        = "ssh-access"
  description = "To allow ssh access from the internet"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}

output "subdomain_url" {
  value = aws_route53_record.dynamic_record.fqdn
}
